# backend/app.py
import os
import subprocess
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from dotenv import load_dotenv
import codecs
import re
import shlex
import ctypes # Dùng cho việc kiểm tra quyền admin trên Windows
import traceback # Để ghi log lỗi chi tiết
import json # Thêm import json

# Tải biến môi trường từ file .env ở thư mục gốc
load_dotenv(dotenv_path='../.env')

app = Flask(__name__)
# Cho phép CORS từ frontend (chạy trên cổng 5173)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

# --- Cấu hình Gemini ---
# Lấy API key mặc định từ file .env
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
# Việc cấu hình API key chủ yếu được xử lý trong hàm generate_response_from_gemini
# để hỗ trợ việc thay đổi key động từ giao diện người dùng.

# --- Ánh xạ cài đặt an toàn (KHÔNG THAY ĐỔI) ---
SAFETY_SETTINGS_MAP = {
    "BLOCK_NONE": [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
    ],
    "BLOCK_ONLY_HIGH": [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
    ],
    "BLOCK_MEDIUM_AND_ABOVE": [ # Mặc định
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    ],
     "BLOCK_LOW_AND_ABOVE": [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_LOW_AND_ABOVE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_LOW_AND_ABOVE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_LOW_AND_ABOVE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_LOW_AND_ABOVE"},
    ],
}

# Hàm tạo prompt để yêu cầu Gemini sinh code (KHÔNG THAY ĐỔI NỘI DUNG PROMPT)
def create_prompt(user_input):
    os_name = "windows" if sys.platform == "win32" else ("macos" if sys.platform == "darwin" else "linux")
    prompt = f"""
Bạn là một trợ lý AI chuyên tạo mã Python ngắn gọn để thực thi các tác vụ trên máy tính ({os_name}) dựa trên yêu cầu của người dùng.
**QUAN TRỌNG:** Chỉ trả về khối mã Python cuối cùng được bao trong ```python ... ```. KHÔNG bao gồm bất kỳ giải thích, lời dẫn, hoặc các bước suy nghĩ nào khác bên ngoài khối mã.
Đảm bảo mã là an toàn và chỉ thực hiện đúng yêu cầu. Đảm bảo mã tương thích với Python 3.
Sử dụng try-except để xử lý lỗi cơ bản nếu có thể. In thông báo kết quả hoặc lỗi ra stdout.

Ví dụ yêu cầu: Mở Control Panel
Mã trả về (ví dụ cho Windows):
```python
import subprocess
import platform

try:
    system = platform.system()
    if system == "Windows":
        try:
            subprocess.run(["control"], check=True, shell=True) # shell=True cần thiết cho lệnh này
            print("Đã thử mở Control Panel.")
        except FileNotFoundError:
            print("Lệnh 'control' không tìm thấy. Có thể hệ thống Windows bị lỗi.")
        except Exception as e_win:
            print(f"Lỗi khi mở Control Panel trên Windows: {{e_win}}")
    elif system == "Darwin": # macOS
        try:
            subprocess.run(["open", "-a", "System Settings"], check=True) # System Settings trên Ventura+
            print("Đã thử mở System Settings.")
        except FileNotFoundError:
             try:
                 subprocess.run(["open", "-a", "System Preferences"], check=True) # System Preferences cũ hơn
                 print("Đã thử mở System Preferences.")
             except FileNotFoundError:
                 print("Lệnh 'open' hoặc System Settings/Preferences không tìm thấy.")
             except Exception as e_mac_pref:
                 print(f"Lỗi khi mở System Preferences trên macOS: {{e_mac_pref}}")
        except Exception as e_mac:
            print(f"Lỗi khi mở System Settings trên macOS: {{e_mac}}")
    elif system == "Linux":
        # Thử các lệnh phổ biến
        commands_to_try = ["gnome-control-center", "mate-control-center", "cinnamon-settings", "systemsettings5", "xfce4-settings-manager"]
        opened = False
        last_error = None
        for cmd in commands_to_try:
             try:
                 subprocess.run([cmd], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                 print(f"Đã thử mở control center bằng lệnh '{{cmd}}'.")
                 opened = True
                 break
             except FileNotFoundError:
                 last_error = f"Lệnh '{{cmd}}' không tìm thấy."
                 continue # Thử lệnh tiếp theo
             except Exception as e_linux:
                 last_error = f"Lỗi khi chạy '{{cmd}}': {{e_linux}}"
                 continue # Thử lệnh tiếp theo
        if not opened:
            print(f"Không thể mở control center bằng các lệnh phổ biến. Lỗi cuối cùng: {{last_error if last_error else 'Không rõ'}}")
    else:
        print(f"Hệ điều hành {{system}} không được hỗ trợ tự động mở cài đặt.")

except Exception as e:
     print(f"Lỗi không xác định khi thực thi: {{e}}")

```

Ví dụ yêu cầu: Tạo thư mục 'temp_folder' trên Desktop
Mã trả về (ví dụ cho Windows):
```python
import os
import platform

try:
    system = platform.system()
    if system == "Windows":
        desktop_path = os.path.join(os.path.join(os.environ['USERPROFILE']), 'Desktop')
    elif system == "Darwin": # macOS
        desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")
    elif system == "Linux":
        desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")
        # Kiểm tra xem thư mục Desktop có tồn tại không, nếu không thì dùng thư mục home
        if not os.path.isdir(desktop_path):
             print(f"Không tìm thấy thư mục Desktop, sẽ tạo trong thư mục Home.")
             desktop_path = os.path.expanduser("~")
    else:
         print(f"Hệ điều hành {{system}} không được hỗ trợ tự động. Tạo trong thư mục hiện tại.")
         desktop_path = "." # Thư mục hiện tại

    temp_dir = os.path.join(desktop_path, 'temp_folder')

    # Tạo thư mục nếu chưa tồn tại
    os.makedirs(temp_dir, exist_ok=True)
    print(f"Đã tạo hoặc đã tồn tại thư mục: {{temp_dir}}")
except Exception as e:
    print(f"Lỗi khi tạo thư mục: {{e}}")
```

Yêu cầu của người dùng: "{user_input}"

Chỉ cung cấp khối mã Python cuối cùng:
"""
    return prompt

# Hàm tạo prompt để yêu cầu Gemini đánh giá code (KHÔNG THAY ĐỔI NỘI DUNG PROMPT)
def create_review_prompt(code_to_review):
    prompt = f"""
Bạn là một chuyên gia đánh giá code Python. Hãy phân tích đoạn mã sau đây và đưa ra nhận xét về:
1.  **Độ an toàn:** Liệu mã có chứa các lệnh nguy hiểm không? Rủi ro?
2.  **Tính đúng đắn:** Mã có thực hiện đúng yêu cầu dự kiến không? Lỗi?
3.  **Tính hiệu quả/Tối ưu:** Có cách viết tốt hơn không?
4.  **Khả năng tương thích:** Chạy được trên các OS khác không?
5.  **Không cần đưa code cải tiến**

Đoạn mã cần đánh giá:
```python
{code_to_review}
```

**QUAN TRỌNG:** Chỉ trả về phần văn bản nhận xét/đánh giá bằng Markdown, có dòng quan trọng cuối cùng là 'Mức độ an toàn: An toàn/Ổn/Nguy hiểm'. KHÔNG bao gồm các câu dẫn như "Đây là đánh giá của tôi:", "Phân tích code:", hoặc các bước suy nghĩ/trung gian. Bắt đầu trực tiếp bằng nội dung đánh giá. Định dạng các khối mã ví dụ (nếu có) trong Markdown bằng ```python ... ```.
"""
    return prompt

# Hàm tạo prompt để yêu cầu Gemini gỡ lỗi code (KHÔNG THAY ĐỔI NỘI DUNG PROMPT)
def create_debug_prompt(original_prompt, failed_code, stdout, stderr):
    prompt = f"""
Bạn là một chuyên gia gỡ lỗi Python. Người dùng đã cố gắng chạy một đoạn mã Python dựa trên yêu cầu ban đầu của họ, nhưng đã gặp lỗi.

**1. Yêu cầu ban đầu của người dùng:**
{original_prompt}

**2. Đoạn mã Python đã chạy và gây lỗi:**
```python
{failed_code}
```

**3. Kết quả Output (stdout) khi chạy mã:**
```
{stdout if stdout else "(Không có output)"}
```

**4. Kết quả Lỗi (stderr) khi chạy mã:**
```
{stderr if stderr else "(Không có lỗi stderr)"}
```

**Nhiệm vụ của bạn:**
a.  **Phân tích:** Xác định nguyên nhân chính xác gây ra lỗi dựa trên `stderr`, `stdout` và mã nguồn.
b.  **Giải thích:** Cung cấp một giải thích rõ ràng, ngắn gọn về lỗi cho người dùng bằng Markdown.
c.  **Đề xuất Hành động / Cài đặt:**
    *   **QUAN TRỌNG:** Nếu lỗi là `ModuleNotFoundError`, hãy xác định tên module bị thiếu và đề xuất lệnh cài đặt **CHÍNH XÁC** bằng pip trong một khối mã riêng biệt và **DUY NHẤT** theo định dạng sau:
        ```bash
        pip install <tên_module_bị_thiếu>
        ```
    *   Nếu lỗi do nguyên nhân khác (thiếu file, quyền, cấu hình môi trường...), hãy đề xuất hành động người dùng cần làm thủ công (ví dụ: tạo file, cấp quyền...). KHÔNG đề xuất lệnh cài đặt pip trong trường hợp này.
d.  **Sửa lỗi Code:** Nếu lỗi có thể sửa trực tiếp trong mã Python (không phải lỗi thiếu module), hãy cung cấp phiên bản mã đã sửa lỗi trong khối ```python ... ``` CUỐI CÙNG. Nếu không thể sửa lỗi trong code, hãy giải thích tại sao và không cần cung cấp khối mã sửa lỗi.

**QUAN TRỌNG:**
*   Trả về phần giải thích và đề xuất hành động (bằng Markdown) trước.
*   Nếu có lệnh cài đặt pip, đặt nó trong khối ```bash ... ``` riêng như yêu cầu.
*   Sau đó, nếu có thể sửa code, cung cấp khối mã ```python ... ``` CUỐI CÙNG chứa code đã sửa. Không thêm lời dẫn hay giải thích nào khác sau khối mã này.
*   Nếu không sửa được code, chỉ cần giải thích và (nếu có) đề xuất hành động/cài đặt.

**Phân tích và đề xuất:**
"""
    return prompt

# Hàm tạo prompt để yêu cầu Gemini giải thích (MỚI)
def create_explain_prompt(content_to_explain, context):
    prompt_header = "Bạn là một trợ lý AI giỏi giải thích các khái niệm kỹ thuật một cách đơn giản, dễ hiểu cho người dùng không chuyên."
    prompt_instruction = "\n\n**Yêu cầu:** Giải thích nội dung sau đây bằng tiếng Việt, sử dụng Markdown, tập trung vào ý nghĩa chính và những điều người dùng cần biết. Giữ cho giải thích ngắn gọn và rõ ràng. Bắt đầu trực tiếp bằng nội dung giải thích, không thêm lời dẫn."
    context_description = ""

    # Làm sạch content nếu là JSON string (loại bỏ các ký tự điều khiển không cần thiết)
    try:
        if isinstance(content_to_explain, str) and content_to_explain.strip().startswith('{') and content_to_explain.strip().endswith('}'):
             parsed_json = json.loads(content_to_explain)
             content_to_explain_formatted = json.dumps(parsed_json, ensure_ascii=False, indent=2) # Định dạng lại cho dễ đọc
        else:
             content_to_explain_formatted = str(content_to_explain) # Đảm bảo là string
    except json.JSONDecodeError:
         content_to_explain_formatted = str(content_to_explain) # Giữ nguyên nếu không phải JSON hợp lệ

    if context == 'python_code':
        context_description = f"Đây là một đoạn mã Python:\n```python\n{content_to_explain_formatted}\n```"
        prompt_instruction = "\n\n**Yêu cầu:** Giải thích đoạn mã Python này làm gì, mục đích chính của nó là gì, và tóm tắt các bước thực hiện chính (nếu có). Trả lời bằng tiếng Việt, sử dụng Markdown. Bắt đầu trực tiếp bằng nội dung giải thích."
    elif context == 'execution_result':
        context_description = f"Đây là kết quả sau khi thực thi một đoạn mã:\n```json\n{content_to_explain_formatted}\n```"
        prompt_instruction = "\n\n**Yêu cầu:** Phân tích kết quả thực thi này (stdout, stderr, mã trả về). Cho biết lệnh có vẻ đã thành công hay thất bại và giải thích ngắn gọn tại sao dựa trên kết quả. Lưu ý cả các cảnh báo (warning) nếu có. Trả lời bằng tiếng Việt, sử dụng Markdown. Bắt đầu trực tiếp bằng nội dung giải thích."
    elif context == 'review_text':
        context_description = f"Đây là một bài đánh giá code:\n```markdown\n{content_to_explain_formatted}\n```"
        prompt_instruction = "\n\n**Yêu cầu:** Tóm tắt và giải thích những điểm chính của bài đánh giá code này bằng ngôn ngữ đơn giản hơn. Trả lời bằng tiếng Việt, sử dụng Markdown. Bắt đầu trực tiếp bằng nội dung giải thích."
    elif context == 'debug_result':
        context_description = f"Đây là kết quả từ việc gỡ lỗi một đoạn mã:\n```json\n{content_to_explain_formatted}\n```"
        prompt_instruction = "\n\n**Yêu cầu:** Giải thích kết quả gỡ lỗi này, bao gồm nguyên nhân lỗi được xác định, ý nghĩa của đề xuất cài đặt package (nếu có), và mục đích của đoạn code đã sửa (nếu có). Trả lời bằng tiếng Việt, sử dụng Markdown. Bắt đầu trực tiếp bằng nội dung giải thích."
    elif context == 'error_message':
        context_description = f"Đây là một thông báo lỗi:\n```\n{content_to_explain_formatted}\n```"
        prompt_instruction = "\n\n**Yêu cầu:** Giải thích thông báo lỗi này có nghĩa là gì, nguyên nhân phổ biến có thể gây ra nó, và gợi ý hướng khắc phục (nếu có thể). Trả lời bằng tiếng Việt, sử dụng Markdown. Bắt đầu trực tiếp bằng nội dung giải thích."
    elif context == 'installation_result':
        context_description = f"Đây là kết quả sau khi cài đặt một package Python:\n```json\n{content_to_explain_formatted}\n```"
        prompt_instruction = "\n\n**Yêu cầu:** Phân tích kết quả cài đặt package này. Cho biết việc cài đặt thành công hay thất bại, và giải thích ngắn gọn output/error từ pip. Trả lời bằng tiếng Việt, sử dụng Markdown. Bắt đầu trực tiếp bằng nội dung giải thích."
    else: # Ngữ cảnh mặc định hoặc không xác định
         context_description = f"Nội dung cần giải thích:\n```\n{content_to_explain_formatted}\n```"
         # Giữ nguyên prompt_instruction mặc định

    full_prompt = f"{prompt_header}{context_description}{prompt_instruction}"
    # print(f"--- Explain Prompt ---\n{full_prompt}\n----------------------") # Bỏ comment để debug prompt
    return full_prompt


# Hàm gọi Gemini API, xử lý việc chọn API Key và các tham số
def generate_response_from_gemini(full_prompt, model_config, is_for_review_or_debug=False):
    global GOOGLE_API_KEY # Dùng key mặc định từ .env
    ui_api_key = None # Key người dùng nhập từ giao diện

    try:
        # Tách api_key từ model_config (nếu có và không rỗng)
        ui_api_key = model_config.pop('api_key', None)
        if ui_api_key and not ui_api_key.strip(): # Nếu key rỗng hoặc chỉ có khoảng trắng
            ui_api_key = None # Xem như không có key từ UI

        # Xác định key sẽ dùng cho lần gọi này
        effective_api_key = ui_api_key if ui_api_key else GOOGLE_API_KEY

        if not effective_api_key:
            print("[LỖI] Không có API Key nào được cấu hình (cả .env và UI).")
            return "Lỗi cấu hình: Thiếu API Key. Vui lòng đặt GOOGLE_API_KEY trong .env hoặc nhập vào Cài đặt."

        # Cấu hình thư viện GenAI cho lần gọi này
        try:
            genai.configure(api_key=effective_api_key)
            if ui_api_key:
                 print("[INFO] Sử dụng API Key từ giao diện cho yêu cầu này.")
            # else: # Không cần in log khi dùng key mặc định
                 # print("[INFO] Sử dụng API Key từ .env cho yêu cầu này.")
        except Exception as config_e:
             key_source = "giao diện" if ui_api_key else ".env"
             print(f"[LỖI] Lỗi khi cấu hình Gemini với API Key từ {key_source}: {config_e}")
             # Trả về lỗi rõ ràng hơn cho người dùng
             error_detail = str(config_e)
             if "API key not valid" in error_detail:
                  return f"Lỗi cấu hình: API key từ {key_source} không hợp lệ. Vui lòng kiểm tra lại."
             else:
                  return f"Lỗi cấu hình: Không thể cấu hình Gemini với API key từ {key_source} ({error_detail})."

        # Lấy các tham số khác từ model_config
        model_name = model_config.get('model_name', 'gemini-1.5-flash')
        if not model_name: model_name = 'gemini-1.5-flash' # Đảm bảo có model name mặc định

        temperature = model_config.get('temperature', 0.7)
        top_p = model_config.get('top_p', 0.95) # Sửa lại giá trị mặc định của top_p
        top_k = model_config.get('top_k', 40)
        safety_setting_key = model_config.get('safety_setting', 'BLOCK_MEDIUM_AND_ABOVE')
        safety_settings = SAFETY_SETTINGS_MAP.get(safety_setting_key, SAFETY_SETTINGS_MAP['BLOCK_MEDIUM_AND_ABOVE'])

        generation_config = GenerationConfig(
            temperature=float(temperature),
            top_p=float(top_p),
            top_k=int(top_k)
        )

        print(f"Đang gọi model: {model_name} với cấu hình: T={temperature}, P={top_p}, K={top_k}, Safety={safety_setting_key}")
        model = genai.GenerativeModel(model_name=model_name)

        # Gọi API
        response = model.generate_content(
            full_prompt,
            generation_config=generation_config,
            safety_settings=safety_settings
        )

        # Kiểm tra nếu phản hồi bị chặn bởi bộ lọc an toàn
        if not response.candidates and hasattr(response, 'prompt_feedback') and response.prompt_feedback.block_reason:
            block_reason = response.prompt_feedback.block_reason.name
            safety_ratings_str = str(getattr(response.prompt_feedback, 'safety_ratings', 'Không có'))
            print(f"Cảnh báo: Phản hồi bị chặn vì lý do: {block_reason}. Ratings: {safety_ratings_str}")
            return f"Lỗi: Phản hồi bị chặn bởi cài đặt an toàn (Lý do: {block_reason}). Hãy thử điều chỉnh Safety Settings hoặc prompt."

        raw_text = response.text.strip()

        # Dọn dẹp phần dẫn nhập không cần thiết trong output review/debug/explain
        # Áp dụng cả cho giải thích
        if is_for_review_or_debug and raw_text:
             lines = raw_text.splitlines()
             cleaned_lines = []
             # Các tiền tố hay gặp cần loại bỏ
             prefixes_to_remove = (
                 "đây là đánh giá", "here is the review", "phân tích code",
                 "review:", "analysis:", "đây là phân tích", "here is the analysis",
                 "giải thích và đề xuất:", "phân tích và đề xuất:",
                 "đây là giải thích", "here is the explanation", "giải thích:", "explanation:",
                 "[thinking", "[processing", "```text" # Loại bỏ cả các tag thinking/processing nếu có
             )
             first_meaningful_line = False
             for line in lines:
                 stripped_line_lower = line.strip().lower()
                 # Bỏ qua các dòng đầu tiên khớp với tiền tố cần loại bỏ
                 if not first_meaningful_line and any(stripped_line_lower.startswith(p) for p in prefixes_to_remove):
                     continue
                 if line.strip(): # Đánh dấu đã gặp dòng có nội dung
                     first_meaningful_line = True
                 if first_meaningful_line: # Chỉ thêm dòng vào kết quả sau khi đã gặp dòng có nội dung
                     cleaned_lines.append(line)
             final_text = "\n".join(cleaned_lines).strip()
             return final_text

        return raw_text

    except Exception as e:
        error_message = str(e)
        print(f"[LỖI API] Lỗi khi gọi Gemini API ({model_name}): {error_message}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr) # In traceback để debug
        # Trả về các thông báo lỗi thân thiện hơn
        if "API key not valid" in error_message:
             key_source = "giao diện" if ui_api_key else ".env"
             return f"Lỗi cấu hình: API key từ {key_source} không hợp lệ. Vui lòng kiểm tra."
        elif "Could not find model" in error_message or "permission denied" in error_message.lower():
             return f"Lỗi cấu hình: Không tìm thấy hoặc không có quyền truy cập model '{model_name}'."
        elif "invalid" in error_message.lower() and any(p in error_message.lower() for p in ["temperature", "top_p", "top_k", "safety_settings"]):
             return f"Lỗi cấu hình: Giá trị tham số (Temperature/TopP/TopK/Safety) không hợp lệ. ({error_message})"
        elif "Deadline Exceeded" in error_message or "timeout" in error_message.lower():
             return f"Lỗi mạng: Yêu cầu tới Gemini API bị quá thời gian (timeout). Vui lòng thử lại."
        elif "SAFETY" in error_message.upper(): # Lỗi liên quan đến chính sách an toàn
             # Cố gắng lấy thông tin chi tiết hơn nếu có
             details = re.search(r"Finish Reason: (\w+).+Safety Ratings: \[(.+?)]", error_message, re.DOTALL)
             reason_detail = f" (Reason: {details.group(1)}, Ratings: {details.group(2)})" if details else ""
             return f"Lỗi: Yêu cầu hoặc phản hồi có thể vi phạm chính sách an toàn của Gemini.{reason_detail} ({error_message[:100]}...)" # Giới hạn độ dài lỗi gốc
        return f"Lỗi máy chủ khi gọi Gemini: {error_message}"

    finally:
        # QUAN TRỌNG: Reset lại cấu hình global nếu vừa dùng key UI và có key .env khác
        if ui_api_key and GOOGLE_API_KEY and GOOGLE_API_KEY != ui_api_key:
            try:
                # print("[INFO] Đặt lại cấu hình API key global về key từ .env.")
                genai.configure(api_key=GOOGLE_API_KEY)
            except Exception as reset_e:
                # Không nên xảy ra nếu key .env ban đầu hợp lệ
                print(f"[CẢNH BÁO] Không thể đặt lại API key global về key từ .env: {reset_e}")
        elif ui_api_key and not GOOGLE_API_KEY:
             # Nếu không có key .env, không cần làm gì. Lần gọi sau sẽ báo lỗi nếu không có key UI.
             pass
        # Nếu chỉ dùng key .env thì không cần làm gì.

# Hàm trích xuất khối mã Python từ phản hồi của Gemini
def extract_python_code(raw_text):
    # Ưu tiên tìm khối ```python ... ```
    matches_python = list(re.finditer(r"```python\s*([\s\S]*?)\s*```", raw_text))
    if matches_python:
        # Lấy khối cuối cùng nếu có nhiều khối
        return matches_python[-1].group(1).strip()

    # Nếu không có ```python, thử tìm khối ``` chung chung
    matches_generic = list(re.finditer(r"```\s*([\s\S]*?)\s*```", raw_text))
    if matches_generic:
        last_block = matches_generic[-1].group(1).strip()
        # Giả định khối cuối cùng là code Python nếu không có tag ngôn ngữ rõ ràng
        # (Có thể thêm kiểm tra heuristic ở đây nếu cần)
        return last_block

    # Trường hợp không tìm thấy khối mã nào
    print("Cảnh báo: Không tìm thấy khối mã ```python ... ``` hoặc ``` ... ``` trong phản hồi.")
    # Trả về toàn bộ text, hy vọng đó là code (ít khả năng đúng)
    return raw_text.strip()

# Endpoint để sinh code
@app.route('/api/generate', methods=['POST'])
def handle_generate():
    data = request.get_json()
    user_input = data.get('prompt')
    model_config = data.get('model_config', {}) # Đã bao gồm cả api_key (nếu có)

    if not user_input:
        return jsonify({"error": "Vui lòng nhập yêu cầu."}), 400

    full_prompt = create_prompt(user_input)
    # is_for_review_or_debug=False vì đây là sinh code
    raw_response = generate_response_from_gemini(full_prompt, model_config.copy(), is_for_review_or_debug=False)

    # Kiểm tra kết quả trả về từ Gemini
    if raw_response and not raw_response.startswith("Lỗi"):
        generated_code = extract_python_code(raw_response)
        if not generated_code.strip() or ("```" in generated_code and not generated_code.startswith("import ") and not generated_code.startswith("#")):
             print(f"Cảnh báo: Trích xuất code có thể không thành công. Kết quả: {generated_code}")
        potentially_dangerous = ["rm ", "del ", "format ", "shutdown ", "reboot ", "sys.exit(", "rmdir"]
        code_lower = generated_code.lower()
        detected_dangerous = [kw for kw in potentially_dangerous if kw in code_lower]
        if detected_dangerous:
            print(f"Cảnh báo: Mã tạo ra chứa từ khóa có thể nguy hiểm: {detected_dangerous}")
        return jsonify({"code": generated_code})
    elif raw_response:
        status_code = 400 if ("Lỗi cấu hình" in raw_response or "Lỗi: Phản hồi bị chặn" in raw_response) else 500
        return jsonify({"error": raw_response}), status_code
    else:
        return jsonify({"error": "Không thể tạo mã hoặc có lỗi không xác định xảy ra."}), 500

# Endpoint để đánh giá code
@app.route('/api/review', methods=['POST'])
def handle_review():
    data = request.get_json()
    code_to_review = data.get('code')
    model_config = data.get('model_config', {})
    if not code_to_review:
        return jsonify({"error": "Không có mã nào để đánh giá."}), 400

    full_prompt = create_review_prompt(code_to_review)
    # is_for_review_or_debug=True để dọn dẹp output
    review_text = generate_response_from_gemini(full_prompt, model_config.copy(), is_for_review_or_debug=True)

    if review_text and not review_text.startswith("Lỗi"):
        return jsonify({"review": review_text}) # Key trả về là "review"
    elif review_text:
        status_code = 400 if ("Lỗi cấu hình" in review_text or "Lỗi: Phản hồi bị chặn" in review_text) else 500
        return jsonify({"error": review_text}), status_code
    else:
        return jsonify({"error": "Không thể đánh giá mã hoặc có lỗi không xác định xảy ra."}), 500

# Endpoint để thực thi code
@app.route('/api/execute', methods=['POST'])
def handle_execute():
    data = request.get_json()
    code_to_execute = data.get('code')
    run_as_admin = data.get('run_as_admin', False)

    if not code_to_execute:
        return jsonify({"error": "Không có mã nào để thực thi."}), 400

    print(f"--- CẢNH BÁO: Chuẩn bị thực thi mã sau (Yêu cầu Admin/Root: {run_as_admin}) ---")
    print(code_to_execute)
    print(f"----------------------------------------------------------")

    command = [sys.executable, '-c', code_to_execute]
    admin_warning = None

    if run_as_admin:
        if sys.platform == "win32":
            try:
                is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
                if not is_admin:
                    admin_warning = "Đã yêu cầu chạy với quyền Admin, nhưng backend không có quyền này. Đang thực thi với quyền người dùng thông thường."
                    print(f"[CẢNH BÁO] {admin_warning}")
            except Exception as admin_check_e:
                admin_warning = f"Không thể kiểm tra quyền admin ({admin_check_e}). Đang thực thi với quyền người dùng thông thường."
                print(f"[LỖI] {admin_warning}")
        elif sys.platform in ["linux", "darwin"]:
            try:
                subprocess.run(['which', 'sudo'], check=True, capture_output=True, text=True)
                print("[INFO] Thêm 'sudo' vào đầu lệnh theo yêu cầu. Có thể cần nhập mật khẩu trong console backend.")
                command.insert(0, 'sudo')
            except (FileNotFoundError, subprocess.CalledProcessError):
                 admin_warning = "Đã yêu cầu chạy với quyền Root, nhưng không tìm thấy lệnh 'sudo' hoặc kiểm tra thất bại. Đang thực thi với quyền người dùng thông thường."
                 print(f"[LỖI] {admin_warning}")
            except Exception as sudo_check_e:
                 admin_warning = f"Lỗi khi kiểm tra sudo ({sudo_check_e}). Đang thực thi với quyền người dùng thông thường."
                 print(f"[LỖI] {admin_warning}")
        else:
             admin_warning = f"Yêu cầu 'Run as Admin/Root' không được hỗ trợ rõ ràng trên hệ điều hành này ({sys.platform}). Đang thực thi với quyền người dùng thông thường."
             print(f"[CẢNH BÁO] {admin_warning}")

    try:
        process_env = os.environ.copy()
        process_env["PYTHONIOENCODING"] = "utf-8"

        result = subprocess.run(
            command, capture_output=True, encoding='utf-8', errors='replace',
            timeout=30, check=False, env=process_env, text=True
        )
        output = result.stdout
        error_output = result.stderr
        return_code = result.returncode

        print(f"--- Kết quả thực thi (Mã trả về: {return_code}) ---")
        if output: print(f"Output:\n{output}")
        if error_output: print(f"Lỗi Output:\n{error_output}")
        print(f"----------------------------------------------")

        message = "Thực thi thành công." if return_code == 0 else "Thực thi hoàn tất (có thể có lỗi)."
        response_data = {
            "message": message, "output": output, "error": error_output, "return_code": return_code
        }
        if admin_warning:
            response_data["warning"] = admin_warning
        return jsonify(response_data)

    except subprocess.TimeoutExpired:
        print("Lỗi: Thực thi mã vượt quá thời gian cho phép (30 giây).")
        return jsonify({"error": "Thực thi mã vượt quá thời gian cho phép.", "output": "", "error": "Timeout", "return_code": -1, "warning": admin_warning}), 408
    except FileNotFoundError as fnf_error:
         missing_cmd = str(fnf_error)
         if 'sudo' in missing_cmd and run_as_admin and sys.platform != "win32":
              err_msg = "Lỗi hệ thống: Lệnh 'sudo' không được tìm thấy. Không thể chạy với quyền root."
              print(f"[LỖI] {err_msg}")
              return jsonify({"error": err_msg, "output": "", "error": f"FileNotFoundError: {missing_cmd}", "return_code": -1, "warning": admin_warning}), 500
         elif sys.executable in missing_cmd:
              err_msg = f"Lỗi hệ thống: Không tìm thấy trình thông dịch Python tại '{sys.executable}'."
              print(f"[LỖI] {err_msg}")
              return jsonify({"error": err_msg, "output": "", "error": f"FileNotFoundError: {missing_cmd}", "return_code": -1, "warning": admin_warning}), 500
         else:
              print(f"Lỗi FileNotFoundError trong quá trình thực thi code: {fnf_error}")
              return jsonify({"message": "Thực thi thất bại (FileNotFoundError).", "output": "", "error": str(fnf_error), "return_code": -1, "warning": admin_warning}), 200
    except Exception as e:
        print(f"Lỗi nghiêm trọng khi thực thi mã: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return jsonify({"error": f"Lỗi hệ thống khi thực thi mã: {e}", "output": "", "error": str(e), "return_code": -1, "warning": admin_warning}), 500

# Endpoint để gỡ lỗi code
@app.route('/api/debug', methods=['POST'])
def handle_debug():
    data = request.get_json()
    original_prompt = data.get('prompt', '(Không có prompt gốc)')
    failed_code = data.get('code')
    stdout = data.get('stdout', '')
    stderr = data.get('stderr', '')
    model_config = data.get('model_config', {})

    if not failed_code:
        return jsonify({"error": "Thiếu mã lỗi để gỡ rối."}), 400

    full_prompt = create_debug_prompt(original_prompt, failed_code, stdout, stderr)
    # is_for_review_or_debug=True để dọn dẹp output
    raw_response = generate_response_from_gemini(full_prompt, model_config.copy(), is_for_review_or_debug=True)

    if raw_response and not raw_response.startswith("Lỗi"):
        explanation_part = raw_response
        corrected_code = None
        suggested_package = None

        install_match = re.search(r"```bash\s*pip install\s+([\w\-]+)\s*```", explanation_part, re.IGNORECASE)
        if install_match:
            suggested_package = install_match.group(1).strip()
            print(f"Debug: Phát hiện đề xuất cài đặt package: {suggested_package}")
            explanation_part = explanation_part[:install_match.start()].strip() + explanation_part[install_match.end():].strip()

        last_code_block_match = None
        python_matches = list(re.finditer(r"```python\s*([\s\S]*?)\s*```", explanation_part))
        if python_matches:
            last_code_block_match = python_matches[-1]

        if last_code_block_match:
            start_index = last_code_block_match.start()
            potential_explanation_before_code = explanation_part[:start_index].strip()
            if potential_explanation_before_code:
                 explanation_part = potential_explanation_before_code
                 corrected_code = last_code_block_match.group(1).strip()
            else:
                 explanation_part = "(AI chỉ trả về code sửa lỗi, không có giải thích)"
                 corrected_code = last_code_block_match.group(1).strip()

        explanation_part = re.sub(r"^(Phân tích và đề xuất:|Giải thích và đề xuất:)\s*", "", explanation_part, flags=re.IGNORECASE | re.MULTILINE).strip()

        return jsonify({
            "explanation": explanation_part if explanation_part else "(Không có giải thích)",
            "corrected_code": corrected_code,
            "suggested_package": suggested_package
        })
    elif raw_response:
        status_code = 400 if ("Lỗi cấu hình" in raw_response or "Lỗi: Phản hồi bị chặn" in raw_response) else 500
        return jsonify({"error": raw_response}), status_code
    else:
        return jsonify({"error": "Không thể thực hiện gỡ rối hoặc có lỗi không xác định xảy ra."}), 500

# Endpoint để cài đặt package Python bằng pip
@app.route('/api/install_package', methods=['POST'])
def handle_install_package():
    data = request.get_json()
    package_name = data.get('package_name')

    if not package_name:
        return jsonify({"error": "Thiếu tên package để cài đặt."}), 400

    if not re.fullmatch(r"^[a-zA-Z0-9\-_]+$", package_name):
        print(f"[CẢNH BÁO] Tên package không hợp lệ bị từ chối: {package_name}")
        return jsonify({"success": False, "error": f"Tên package không hợp lệ: {package_name}"}), 400

    print(f"--- Chuẩn bị cài đặt package: {package_name} ---")
    command = [sys.executable, '-m', 'pip', 'install', package_name]

    try:
        process_env = os.environ.copy()
        process_env["PYTHONIOENCODING"] = "utf-8"
        result = subprocess.run(
            command, capture_output=True, encoding='utf-8', errors='replace',
            timeout=120, check=False, env=process_env, text=True
        )
        output = result.stdout
        error_output = result.stderr
        return_code = result.returncode

        print(f"--- Kết quả cài đặt (Mã trả về: {return_code}) ---")
        if output: print(f"Output:\n{output}")
        if error_output: print(f"Lỗi Output:\n{error_output}")
        print(f"----------------------------------------------")

        if return_code == 0:
            message = f"Cài đặt '{package_name}' thành công."
            return jsonify({ "success": True, "message": message, "output": output, "error": error_output })
        else:
            message = f"Cài đặt '{package_name}' thất bại."
            detailed_error = error_output.strip() if error_output else f"Lệnh Pip thất bại với mã trả về {return_code}."
            return jsonify({ "success": False, "message": message, "output": output, "error": detailed_error }), 500

    except subprocess.TimeoutExpired:
        print(f"Lỗi: Cài đặt package '{package_name}' vượt quá thời gian cho phép (120 giây).")
        return jsonify({"success": False, "error": f"Timeout khi cài đặt '{package_name}'.", "output": "", "error": "Timeout"}), 408
    except FileNotFoundError:
         print(f"Lỗi: Không tìm thấy '{sys.executable}' hoặc pip.")
         return jsonify({"success": False, "error": "Lỗi hệ thống: Không tìm thấy Python hoặc Pip.", "output": "", "error": "FileNotFoundError"}), 500
    except Exception as e:
        print(f"Lỗi nghiêm trọng khi cài đặt package '{package_name}': {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return jsonify({"success": False, "error": f"Lỗi hệ thống khi cài đặt: {e}", "output": "", "error": str(e)}), 500

# Endpoint để giải thích nội dung (MỚI)
@app.route('/api/explain', methods=['POST'])
def handle_explain():
    data = request.get_json()
    content_to_explain = data.get('content')
    context = data.get('context', 'unknown') # Lấy ngữ cảnh, mặc định là 'unknown'
    model_config = data.get('model_config', {})

    if not content_to_explain:
        return jsonify({"error": "Không có nội dung để giải thích."}), 400

    # Nếu content là object (đã được parse ở frontend), chuyển lại thành string để đưa vào prompt
    if isinstance(content_to_explain, dict) or isinstance(content_to_explain, list):
         try:
              content_to_explain = json.dumps(content_to_explain, ensure_ascii=False, indent=2)
         except Exception as e:
              print(f"Lỗi khi chuyển đổi content object thành JSON string trong /explain: {e}")
              content_to_explain = str(content_to_explain) # Fallback về string

    full_prompt = create_explain_prompt(content_to_explain, context)
    # is_for_review_or_debug=True để áp dụng dọn dẹp output tương tự review/debug
    explanation_text = generate_response_from_gemini(full_prompt, model_config.copy(), is_for_review_or_debug=True)

    if explanation_text and not explanation_text.startswith("Lỗi"):
        # Đảm bảo key trả về là "explanation"
        return jsonify({"explanation": explanation_text})
    elif explanation_text: # Có lỗi trả về từ Gemini
        status_code = 400 if ("Lỗi cấu hình" in explanation_text or "Lỗi: Phản hồi bị chặn" in explanation_text) else 500
        return jsonify({"error": explanation_text}), status_code
    else:
        return jsonify({"error": "Không thể tạo giải thích hoặc có lỗi không xác định xảy ra."}), 500


if __name__ == '__main__':
    print("Backend đang chạy tại http://localhost:5001")
    # Thông báo về quyền admin khi khởi động (chỉ để biết)
    if sys.platform == "win32":
        try:
            is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
            if is_admin:
                print("[INFO] Backend đang chạy với quyền Administrator.")
            else:
                print("[INFO] Backend đang chạy với quyền User thông thường.")
        except Exception:
            print("[CẢNH BÁO] Không thể kiểm tra quyền admin khi khởi động.")

    app.run(debug=True, port=5001) # Chạy Flask server