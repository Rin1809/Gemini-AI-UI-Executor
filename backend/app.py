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
import json
import tempfile
import stat # cho chmod

# Tải biến môi trường từ file .env ở thư mục gốc
load_dotenv(dotenv_path='../.env')

app = Flask(__name__)
# Cho phép CORS từ frontend (chạy trên cổng 5173)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

# --- Cấu hình Gemini ---
# Lấy API key mặc định từ file .env nếu có set, không thì lấy API key dán vào api ui trong run settingsetting
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
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

# clean tên HĐH 
def get_os_name(platform_str):
    if platform_str == "win32": return "windows"
    if platform_str == "darwin": return "macos"
    return "linux" # không win thì mac, không mac thì auto set thành linuxlinux

# Helper ánh xạ extension sang tên ngôn ngữ thân thiện
def get_language_name(file_ext):
    if not file_ext: return "code" # Fallback nếu không có extension
    ext_lower = file_ext.lower()
    if ext_lower == 'py': return 'Python'
    if ext_lower == 'sh': return 'Shell Script (Bash)'
    if ext_lower == 'bat': return 'Batch Script'
    if ext_lower == 'ps1': return 'PowerShell'
    if ext_lower == 'js': return 'JavaScript'
    if ext_lower == 'ts': return 'TypeScript'
    if ext_lower == 'html': return 'HTML'
    if ext_lower == 'css': return 'CSS'
    if ext_lower == 'json': return 'JSON'
    if ext_lower == 'yaml': return 'YAML'
    if ext_lower == 'sql': return 'SQL'
    # Thêm các ngôn ngữ khác nếu cần
    return f'file .{ext_lower}' # Mặc định

# Hàm tạo prompt để yêu cầu Gemini sinh code 
def create_prompt(user_input, backend_os_name, target_os_name, file_type):
    # Xác định file type description và extension
    file_extension = ""
    file_type_description = ""
    # Xử lý file_type_input có thể là tên file đầy đủ hoặc chỉ extension
    if file_type and '.' in file_type:
        file_extension = file_type.split('.')[-1].lower() # Lấy phần sau dấu chấm cuối cùng
        file_type_description = f"một file có tên `{file_type}`"
    elif file_type:
        file_extension = file_type.lower()
        file_type_description = f"một file loại `.{file_extension}` ({get_language_name(file_extension)})"
    else: # mặc định là python 
        file_extension = "py"
        file_type_description = f"một script Python (`.{file_extension}`)"

    # Đảm bảo có file_extension hợp lệ để dùng làm tag code block
    code_block_tag = file_extension if file_extension and file_extension.isalnum() else 'code'

    prompt = f"""
Bạn là một trợ lý AI chuyên tạo mã nguồn để thực thi các tác vụ trên máy tính dựa trên yêu cầu của người dùng.
**Môi trường Backend:** Máy chủ đang chạy {backend_os_name}.
**Mục tiêu Người dùng:** Tạo mã phù hợp để lưu vào **{file_type_description}** và chạy trên hệ điều hành **{target_os_name}**.

**YÊU CẦU TUYỆT ĐỐI:**
1.  **PHẢN HỒI CỦA BẠN *CHỈ* ĐƯỢC PHÉP CHỨA KHỐI MÃ NGUỒN.**
2.  Khối mã phải được bao trong dấu ```{code_block_tag} ... ```.
3.  **TUYỆT ĐỐI KHÔNG** bao gồm bất kỳ văn bản nào khác, không giải thích, không lời chào, không ghi chú, không có gì bên ngoài cặp dấu ```{code_block_tag} ... ```. Toàn bộ phản hồi phải là khối mã đó.
4.  Đảm bảo mã là **an toàn** và **chỉ thực hiện đúng yêu cầu**.
5.  Nếu là script (Python, Shell, PowerShell, Batch):
    *   Sử dụng `try-except` (hoặc cách xử lý lỗi tương đương) để xử lý lỗi cơ bản nếu có thể.
    *   In thông báo kết quả hoặc lỗi ra `stdout` hoặc `stderr` để người dùng biết chuyện gì đang xảy ra.
    *   Đối với Python, đảm bảo tương thích Python 3.
    *   Đối với Shell, ưu tiên cú pháp tương thích `bash`.
    *   Đối với Batch/PowerShell, đảm bảo cú pháp Windows hợp lệ.
6.  LUÔN LUÔN có cơ chế thông báo kết quả của code (ví dụ: if else)
7.  Chú ý và xem xét xem loại file đó khi chạy có hỗ trợ tiếng việt không, nếu có thì hãy ghi kết quả trả về bằng tiếng việt có dấu, nếu không thì hãy ghi không dấu để tránh rối loạn ký tự trong output.  

**Ví dụ Yêu cầu:** Tạo thư mục 'temp_folder' trên Desktop (Mục tiêu: Windows, Loại file: .bat)
**Mã trả về (Ví dụ cho .bat):**
```bat

#...logic code

if not exist "%target_dir%" (
    mkdir "%target_dir%"
    if %errorlevel% == 0 (
        echo Da tao thu muc: "%target_dir%"
    ) else (
        echo Loi khi tao thu muc: "%target_dir%" >&2
        exit /b 1
    )
) else (
    echo Thu muc da ton tai: "%target_dir%"
)

endlocal
exit /b 0
```

**Ví dụ Yêu cầu:** Mở Control Panel (Mục tiêu: Linux, Loại file: .sh)
**Mã trả về (Ví dụ cho .sh):**
```sh
#!/bin/bash

#...logic code


                 echo "Da thu mo bang lenh: $cmd"
                 opened=true
                 # Không thể chắc chắn nó đã mở thành công, chỉ là đã thử chạy
                 disown $pid # Để nó chạy tiếp sau khi script kết thúc
                 break
            else
                 last_error="Lenh '$cmd' da chay nhung co the da dong ngay lap tuc."
            fi
        else
            last_error="Loi khi chay lenh '$cmd': $?"
        fi
    else
         # Lệnh không tồn tại, không ghi lỗi ở đây, sẽ báo sau nếu không tìm thấy lệnh nào
         :
    fi
done

if [ "$opened" = false ]; then
    echo "Khong the mo Control Panel/Settings bang cac lenh pho bien." >&2
    if [ -n "$last_error" ]; then
        echo "Loi cuoi cung: $last_error" >&2
    fi
    exit 1
fi

exit 0
```

**(Nhắc lại)** Chỉ cung cấp khối mã nguồn cuối cùng cho **{file_type_description}** trên **{target_os_name}** trong cặp dấu ```{code_block_tag} ... ```.

**Yêu cầu của người dùng:** "{user_input}"

**Khối mã nguồn:**
"""
    return prompt


# Hàm tạo prompt để yêu cầu Gemini đánh giá code 
def create_review_prompt(code_to_review, language): # Nhận language là extension (py, sh, bat, v.v...)
    language_name = get_language_name(language) # Lấy tên ngôn ngữ an toàn
    code_block_tag = language if language and language.isalnum() else 'code' # Tag cho khối mã

    prompt = f"""
Bạn là một chuyên gia đánh giá code **{language_name}**. Hãy phân tích đoạn mã **{language_name}** sau đây và đưa ra nhận xét về:
1.  **Độ an toàn:** Liệu mã có chứa các lệnh nguy hiểm không? Rủi ro? (Đặc biệt chú ý với script hệ thống như Batch/Shell)
2.  **Tính đúng đắn:** Mã có thực hiện đúng yêu cầu dự kiến không? Có lỗi cú pháp hoặc logic nào không?
3.  **Tính hiệu quả/Tối ưu:** Có cách viết tốt hơn, ngắn gọn hơn hoặc hiệu quả hơn trong **{language_name}** không?
4.  **Khả năng tương thích:** Chạy được trên các OS khác không (nếu có thể áp dụng)?
5.  **Không cần đưa code cải tiến**

Đoạn mã **{language_name}** cần đánh giá:
```{code_block_tag}
{code_to_review}
```

**QUAN TRỌNG:** Chỉ trả về phần văn bản nhận xét/đánh giá bằng Markdown. Bắt đầu trực tiếp bằng nội dung đánh giá. Định dạng các khối mã ví dụ (nếu có) trong Markdown bằng ```{code_block_tag} ... ```. Kết thúc bằng dòng 'Mức độ an toàn: An toàn/Ổn/Nguy hiểm'.
"""
    return prompt

# Hàm tạo prompt để yêu cầu Gemini gỡ lỗi code 
def create_debug_prompt(original_prompt, failed_code, stdout, stderr, language): # Nhận language là extension
    language_name = get_language_name(language)
    code_block_tag = language if language and language.isalnum() else 'code'

    prompt = f"""
Bạn là một chuyên gia gỡ lỗi **{language_name}**. Người dùng đã cố gắng chạy một đoạn mã **{language_name}** dựa trên yêu cầu ban đầu của họ, nhưng đã gặp lỗi.

**1. Yêu cầu ban đầu của người dùng:**
{original_prompt}

**2. Đoạn mã {language_name} đã chạy và gây lỗi:**
```{code_block_tag}
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
a.  **Phân tích:** Xác định nguyên nhân chính xác gây ra lỗi dựa trên `stderr`, `stdout` và mã nguồn **{language_name}**.
b.  **Giải thích:** Cung cấp một giải thích rõ ràng, ngắn gọn về lỗi cho người dùng bằng Markdown.
c.  **Đề xuất Hành động / Cài đặt:**
    *   **QUAN TRỌNG (CHỈ CHO PYTHON):** Nếu lỗi là `ModuleNotFoundError` (và ngôn ngữ là Python), hãy xác định tên module và đề xuất lệnh `pip install` trong khối ```bash ... ``` DUY NHẤT.
    *   Nếu lỗi do nguyên nhân khác (thiếu file, quyền, cú pháp sai, lệnh không tồn tại trong Batch/Shell, cấu hình môi trường...) hoặc **ngôn ngữ không phải Python**, hãy đề xuất hành động người dùng cần làm thủ công. **KHÔNG đề xuất `pip install` cho ngôn ngữ không phải Python.**
d.  **Sửa lỗi Code:** Nếu lỗi có thể sửa trực tiếp trong mã **{language_name}**, hãy cung cấp phiên bản mã đã sửa lỗi trong khối ```{code_block_tag} ... ``` CUỐI CÙNG. Nếu không thể sửa lỗi trong code, hãy giải thích tại sao.

**QUAN TRỌNG:**
*   Trả về phần giải thích và đề xuất hành động (bằng Markdown) trước.
*   Nếu có lệnh cài đặt pip (chỉ cho Python), đặt nó trong khối ```bash ... ``` riêng.
*   Sau đó, nếu có thể sửa code, cung cấp khối mã ```{code_block_tag} ... ``` CUỐI CÙNG chứa code đã sửa. Không thêm lời dẫn hay giải thích nào khác sau khối mã này.
*   Nếu không sửa được code, chỉ cần giải thích và (nếu có) đề xuất hành động/cài đặt.

**Phân tích và đề xuất:**
"""
    return prompt


# Hàm tạo prompt để yêu cầu Gemini giải thích 
def create_explain_prompt(content_to_explain, context, language=None): # Nhận language là extension (optional)
    prompt_header = "Bạn là một trợ lý AI giỏi giải thích các khái niệm kỹ thuật một cách đơn giản, dễ hiểu cho người dùng không chuyên."
    prompt_instruction = "\n\n**Yêu cầu:** Giải thích nội dung sau đây bằng tiếng Việt, sử dụng Markdown, tập trung vào ý nghĩa chính và những điều người dùng cần biết. Giữ cho giải thích ngắn gọn và rõ ràng. Bắt đầu trực tiếp bằng nội dung giải thích, không thêm lời dẫn."
    context_description = ""
    language_name = get_language_name(language) if language else "nội dung"
    code_block_tag = language if language and language.isalnum() else 'code'

    try:
        if isinstance(content_to_explain, str) and content_to_explain.strip().startswith('{') and content_to_explain.strip().endswith('}'):
             parsed_json = json.loads(content_to_explain)
             content_to_explain_formatted = json.dumps(parsed_json, ensure_ascii=False, indent=2)
        else:
             content_to_explain_formatted = str(content_to_explain)
    except json.JSONDecodeError:
         content_to_explain_formatted = str(content_to_explain)

    if context == 'code': # Sử dụng context 'code' chung
        context_description = f"Đây là một đoạn mã **{language_name}**:\n```{code_block_tag}\n{content_to_explain_formatted}\n```"
        prompt_instruction = f"\n\n**Yêu cầu:** Giải thích đoạn mã **{language_name}** này làm gì, mục đích chính của nó là gì, và tóm tắt các bước thực hiện chính (nếu có). Trả lời bằng tiếng Việt, sử dụng Markdown. Bắt đầu trực tiếp bằng nội dung giải thích."
    elif context == 'execution_result':
        context_description = f"Đây là kết quả sau khi thực thi một đoạn mã:\n```json\n{content_to_explain_formatted}\n```"
        prompt_instruction = "\n\n**Yêu cầu:** Phân tích kết quả thực thi này (stdout, stderr, mã trả về). Cho biết lệnh có vẻ đã thành công hay thất bại và giải thích ngắn gọn tại sao dựa trên kết quả. Lưu ý cả các cảnh báo (warning) nếu có. Trả lời bằng tiếng Việt, sử dụng Markdown. Bắt đầu trực tiếp bằng nội dung giải thích."
    elif context == 'review_text':
        context_description = f"Đây là một bài đánh giá code:\n```markdown\n{content_to_explain_formatted}\n```"
        prompt_instruction = "\n\n**Yêu cầu:** Tóm tắt và giải thích những điểm chính của bài đánh giá code này bằng ngôn ngữ đơn giản hơn. Trả lời bằng tiếng Việt, sử dụng Markdown. Bắt đầu trực tiếp bằng nội dung giải thích."
    elif context == 'debug_result':
        # Cố gắng lấy language từ content nếu là object
        debug_language = language
        if isinstance(content_to_explain, str): # Nếu đã là string JSON
            try:
                parsed_debug = json.loads(content_to_explain)
                debug_language = parsed_debug.get('original_language', language) # Lấy ngôn ngữ gốc nếu có
            except json.JSONDecodeError: pass
        elif isinstance(content_to_explain, dict): # Nếu là object
             debug_language = content_to_explain.get('original_language', language)

        language_name = get_language_name(debug_language) if debug_language else "code"

        context_description = f"Đây là kết quả từ việc gỡ lỗi một đoạn mã {language_name}:\n```json\n{content_to_explain_formatted}\n```"
        prompt_instruction = f"\n\n**Yêu cầu:** Giải thích kết quả gỡ lỗi này, bao gồm nguyên nhân lỗi được xác định, ý nghĩa của đề xuất cài đặt package (nếu có và chỉ cho Python), và mục đích của đoạn code {language_name} đã sửa (nếu có). Trả lời bằng tiếng Việt, sử dụng Markdown. Bắt đầu trực tiếp bằng nội dung giải thích."
    elif context == 'error_message':
        context_description = f"Đây là một thông báo lỗi:\n```\n{content_to_explain_formatted}\n```"
        prompt_instruction = "\n\n**Yêu cầu:** Giải thích thông báo lỗi này có nghĩa là gì, nguyên nhân phổ biến có thể gây ra nó, và gợi ý hướng khắc phục (nếu có thể). Trả lời bằng tiếng Việt, sử dụng Markdown. Bắt đầu trực tiếp bằng nội dung giải thích."
    elif context == 'installation_result':
        context_description = f"Đây là kết quả sau khi cài đặt một package Python:\n```json\n{content_to_explain_formatted}\n```"
        prompt_instruction = "\n\n**Yêu cầu:** Phân tích kết quả cài đặt package này. Cho biết việc cài đặt thành công hay thất bại, và giải thích ngắn gọn output/error từ pip. Trả lời bằng tiếng Việt, sử dụng Markdown. Bắt đầu trực tiếp bằng nội dung giải thích."
    else: # Ngữ cảnh mặc định hoặc không xác định
         context_description = f"Nội dung cần giải thích:\n```\n{content_to_explain_formatted}\n```"

    full_prompt = f"{prompt_header}{context_description}{prompt_instruction}"
    return full_prompt


# Hàm gọi Gemini API, xử lý việc chọn API Key và các tham số
def generate_response_from_gemini(full_prompt, model_config, is_for_review_or_debug=False):
    global GOOGLE_API_KEY # Dùng key mặc định từ .env
    ui_api_key = None # Key người dùng nhập từ giao diện

    try:
        ui_api_key = model_config.pop('api_key', None)
        if ui_api_key and not ui_api_key.strip():
            ui_api_key = None

        effective_api_key = ui_api_key if ui_api_key else GOOGLE_API_KEY

        if not effective_api_key:
            print("[LỖI] Không có API Key nào được cấu hình (cả .env và UI).")
            return "Lỗi cấu hình: Thiếu API Key. Vui lòng đặt GOOGLE_API_KEY trong .env hoặc nhập vào Cài đặt."

        try:
            genai.configure(api_key=effective_api_key)
            if ui_api_key:
                 print("[INFO] Sử dụng API Key từ giao diện cho yêu cầu này.")
        except Exception as config_e:
             key_source = "giao diện" if ui_api_key else ".env"
             print(f"[LỖI] Lỗi khi cấu hình Gemini với API Key từ {key_source}: {config_e}")
             error_detail = str(config_e)
             if "API key not valid" in error_detail:
                  return f"Lỗi cấu hình: API key từ {key_source} không hợp lệ. Vui lòng kiểm tra lại."
             else:
                  return f"Lỗi cấu hình: Không thể cấu hình Gemini với API key từ {key_source} ({error_detail})."

        model_name = model_config.get('model_name', 'gemini-1.5-flash')
        if not model_name: model_name = 'gemini-1.5-flash'

        temperature = model_config.get('temperature', 0.7)
        top_p = model_config.get('top_p', 0.95)
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

        response = model.generate_content(
            full_prompt,
            generation_config=generation_config,
            safety_settings=safety_settings
        )

        if not response.candidates and hasattr(response, 'prompt_feedback') and response.prompt_feedback.block_reason:
            block_reason = response.prompt_feedback.block_reason.name
            safety_ratings_str = str(getattr(response.prompt_feedback, 'safety_ratings', 'Không có'))
            print(f"Cảnh báo: Phản hồi bị chặn vì lý do: {block_reason}. Ratings: {safety_ratings_str}")
            return f"Lỗi: Phản hồi bị chặn bởi cài đặt an toàn (Lý do: {block_reason}). Hãy thử điều chỉnh Safety Settings hoặc prompt."

        # 3 dòng print này để debug raw response / xóa comment r test check terminal
        # print("--- RAW GEMINI RESPONSE ---")
        # print(response.text)
        # print("---------------------------")

        raw_text = response.text.strip()

        if is_for_review_or_debug and raw_text:
             lines = raw_text.splitlines()
             cleaned_lines = []
             prefixes_to_remove = (
                 "đây là đánh giá", "here is the review", "phân tích code",
                 "review:", "analysis:", "đây là phân tích", "here is the analysis",
                 "giải thích và đề xuất:", "phân tích và đề xuất:",
                 "đây là giải thích", "here is the explanation", "giải thích:", "explanation:",
                 "[thinking", "[processing", "```text"
             )
             first_meaningful_line = False
             for line in lines:
                 stripped_line_lower = line.strip().lower()
                 if not first_meaningful_line and any(stripped_line_lower.startswith(p) for p in prefixes_to_remove):
                     continue
                 if line.strip():
                     first_meaningful_line = True
                 if first_meaningful_line:
                     cleaned_lines.append(line)
             final_text = "\n".join(cleaned_lines).strip()
             # same
             # print("--- CLEANED RESPONSE ---") # Debug cleaned text
             # print(final_text)
             # print("------------------------")
             return final_text

        return raw_text

    except Exception as e:
        error_message = str(e)
        model_name = model_config.get('model_name', 'unknown_model') # Lấy tên model để báo lỗi
        print(f"[LỖI API] Lỗi khi gọi Gemini API ({model_name}): {error_message}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        if "API key not valid" in error_message:
             key_source = "giao diện" if ui_api_key else ".env"
             return f"Lỗi cấu hình: API key từ {key_source} không hợp lệ. Vui lòng kiểm tra."
        elif "Could not find model" in error_message or "permission denied" in error_message.lower():
             return f"Lỗi cấu hình: Không tìm thấy hoặc không có quyền truy cập model '{model_name}'."
        elif "invalid" in error_message.lower() and any(p in error_message.lower() for p in ["temperature", "top_p", "top_k", "safety_settings"]):
             return f"Lỗi cấu hình: Giá trị tham số (Temperature/TopP/TopK/Safety) không hợp lệ. ({error_message})"
        elif "Deadline Exceeded" in error_message or "timeout" in error_message.lower():
             return f"Lỗi mạng: Yêu cầu tới Gemini API bị quá thời gian (timeout). Vui lòng thử lại."
        elif "SAFETY" in error_message.upper():
             details = re.search(r"Finish Reason: (\w+).+Safety Ratings: \[(.+?)]", error_message, re.DOTALL)
             reason_detail = f" (Reason: {details.group(1)}, Ratings: {details.group(2)})" if details else ""
             return f"Lỗi: Yêu cầu hoặc phản hồi có thể vi phạm chính sách an toàn của Gemini.{reason_detail} ({error_message[:100]}...)"
        return f"Lỗi máy chủ khi gọi Gemini: {error_message}"

    finally:
        if ui_api_key and GOOGLE_API_KEY and GOOGLE_API_KEY != ui_api_key:
            try:
                genai.configure(api_key=GOOGLE_API_KEY)
            except Exception as reset_e:
                print(f"[CẢNH BÁO] Không thể đặt lại API key global về key từ .env: {reset_e}")
        elif ui_api_key and not GOOGLE_API_KEY:
             pass

# Hàm trích xuất khối mã Python từ phản hồi của Gemini 
def extract_code_block(raw_text, requested_extension):
    # Ưu tiên tìm khối mã với đúng extension hoặc các alias phổ biến
    primary_tags = [requested_extension]
    if requested_extension == 'py': primary_tags.append('python')
    if requested_extension == 'sh': primary_tags.append('bash')
    if requested_extension == 'bat': primary_tags.append('batch')
    if requested_extension == 'ps1': primary_tags.append('powershell')
    # Thêm các alias khác nếu cần

    for tag in primary_tags:
        pattern = r"```" + re.escape(tag) + r"\s*([\s\S]*?)\s*```"
        matches = list(re.finditer(pattern, raw_text, re.IGNORECASE))
        if matches:
            print(f"[INFO] Found code block with tag: {tag}")
            return matches[-1].group(1).strip()

    # Nếu không có tag khớp, thử tìm khối ``` chung chung
    matches_generic = list(re.finditer(r"```\s*([\s\S]*?)\s*```", raw_text))
    if matches_generic:
        last_block = matches_generic[-1].group(1).strip()
        print(f"[WARN] Found generic code block ```...```. Assuming it's the correct type for .{requested_extension}")
        return last_block

    # Trường hợp không tìm thấy khối mã nào rõ ràng
    print(f"[WARN] Could not find specific code block for .{requested_extension} or generic block. Returning raw text as fallback.")
    return raw_text.strip() 

# Endpoint để sinh code
@app.route('/api/generate', methods=['POST'])
def handle_generate():
    data = request.get_json()
    user_input = data.get('prompt')
    model_config = data.get('model_config', {})
    target_os_input = data.get('target_os', 'auto')
    file_type_input = data.get('file_type', 'py') # Nhận cả tên file hoặc chỉ extension

    if not user_input:
        return jsonify({"error": "Vui lòng nhập yêu cầu."}), 400

    backend_os_name = get_os_name(sys.platform)
    target_os_name = backend_os_name if target_os_input == 'auto' else target_os_input

    # Xác định extension từ file_type_input để dùng trong extract_code_block
    file_extension = file_type_input.split('.')[-1].lower() if '.' in file_type_input else file_type_input.lower()
    if not file_extension or not file_extension.isalnum():
        file_extension = 'py' # Default nếu rỗng hoặc không hợp lệ

    full_prompt = create_prompt(user_input, backend_os_name, target_os_name, file_type_input)
    raw_response = generate_response_from_gemini(full_prompt, model_config.copy(), is_for_review_or_debug=False)

    print("-" * 20 + " RAW GEMINI RESPONSE (Generate) " + "-" * 20)
    print(raw_response)
    print("-" * 60)

    if raw_response and not raw_response.startswith("Lỗi"):
        generated_code = extract_code_block(raw_response, file_extension)

        # Kiểm tra xem có phải trả về text thô không
        # Điều chỉnh heuristic: chỉ coi là raw text nếu nó bằng raw_response VÀ KHÔNG bắt đầu bằng dấu ```
        is_likely_raw_text = (generated_code == raw_response) and not generated_code.strip().startswith("```")

        if not generated_code.strip() or is_likely_raw_text:
             print(f"[LỖI] AI không trả về khối mã hợp lệ. Phản hồi thô: {raw_response[:200]}...")
             return jsonify({"error": f"AI không trả về khối mã hợp lệ. Phản hồi nhận được bắt đầu bằng: '{raw_response[:50]}...'"}), 500
        else:
            potentially_dangerous = ["rm ", "del ", "format ", "shutdown ", "reboot ", ":(){:|:&};:", "dd if=/dev/zero", "mkfs"]
            code_lower = generated_code.lower()
            detected_dangerous = [kw for kw in potentially_dangerous if kw in code_lower]
            if detected_dangerous:
                print(f"Cảnh báo: Mã tạo ra chứa từ khóa có thể nguy hiểm: {detected_dangerous}")
            # Trả về code và cả file_extension đã dùng để sinh/trích xuất
            return jsonify({"code": generated_code, "generated_for_type": file_extension})
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
    file_type = data.get('file_type', 'py') # Nhận loại file từ frontend

    if not code_to_review:
        return jsonify({"error": "Không có mã nào để đánh giá."}), 400

    # Đảm bảo file_type chỉ là extension
    language_extension = file_type.split('.')[-1].lower() if '.' in file_type else file_type.lower()
    if not language_extension: language_extension = 'py' # Default

    full_prompt = create_review_prompt(code_to_review, language_extension) # Truyền extension
    review_text = generate_response_from_gemini(full_prompt, model_config.copy(), is_for_review_or_debug=True)

    if review_text and not review_text.startswith("Lỗi"):
        return jsonify({"review": review_text})
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
    file_type_requested = data.get('file_type', 'py') # Nhận loại file được yêu cầu

    if not code_to_execute:
        return jsonify({"error": "Không có mã nào để thực thi."}), 400

    backend_os = get_os_name(sys.platform)
    admin_warning = None
    temp_file_path = None
    command = []

    if '.' in file_type_requested:
         file_extension = file_type_requested.split('.')[-1].lower()
    else:
         file_extension = file_type_requested.lower()
    if not file_extension or not file_extension.isalnum(): file_extension = 'py'

    print(f"--- CẢNH BÁO: Chuẩn bị thực thi code dưới dạng file .{file_extension} (Yêu cầu Admin/Root: {run_as_admin}) ---")

    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix=f'.{file_extension}', delete=False, encoding='utf-8', newline='') as temp_file:
            temp_file_path = temp_file.name
            temp_file.write(code_to_execute)
        print(f"[INFO] Đã lưu code vào file tạm: {temp_file_path}")

        if backend_os in ["linux", "macos"] and file_extension in ['sh', 'py']:
            try:
                current_stat = os.stat(temp_file_path).st_mode
                os.chmod(temp_file_path, current_stat | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
                print(f"[INFO] Đã cấp quyền thực thi (chmod +x) cho: {temp_file_path}")
            except Exception as chmod_e:
                print(f"[LỖI] Không thể cấp quyền thực thi cho file tạm: {chmod_e}")

        interpreter_path = sys.executable
        if file_extension == 'py':
            command = [interpreter_path, temp_file_path]
        elif file_extension == 'bat' and backend_os == 'windows':
            command = ['cmd', '/c', temp_file_path]
        elif file_extension == 'ps1' and backend_os == 'windows':
            command = ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', temp_file_path]
        elif file_extension == 'sh' and backend_os in ['linux', 'macos']:
             command = ['bash', temp_file_path]
        elif backend_os == 'windows':
            command = ['cmd', '/c', temp_file_path]
            print(f"[WARN] Loại file '.{file_extension}' không xác định rõ trên Windows, thử chạy bằng cmd /c.")
        elif backend_os in ['linux', 'macos']:
             command = ['bash', temp_file_path]
             print(f"[WARN] Loại file '.{file_extension}' không xác định rõ trên {backend_os}, thử chạy bằng bash.")
        else:
             return jsonify({"error": f"Không hỗ trợ thực thi file .{file_extension} trên hệ điều hành backend không xác định: {backend_os}"}), 501

        if run_as_admin:
            if backend_os == "windows":
                try:
                    is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
                    if not is_admin:
                        admin_warning = "Đã yêu cầu chạy với quyền Admin, nhưng backend không có quyền này. Thực thi với quyền thường."
                        print(f"[CẢNH BÁO] {admin_warning}")
                except Exception as admin_check_e:
                    admin_warning = f"Không thể kiểm tra quyền admin ({admin_check_e}). Thực thi với quyền thường."
                    print(f"[LỖI] {admin_warning}")
            elif backend_os in ["linux", "darwin"]:
                try:
                    subprocess.run(['which', 'sudo'], check=True, capture_output=True, text=True)
                    print("[INFO] Thêm 'sudo' vào đầu lệnh. Có thể cần nhập mật khẩu trong console backend.")
                    command.insert(0, 'sudo')
                except (FileNotFoundError, subprocess.CalledProcessError):
                     admin_warning = "Đã yêu cầu chạy với quyền Root, nhưng không tìm thấy 'sudo' hoặc kiểm tra thất bại. Thực thi với quyền thường."
                     print(f"[LỖI] {admin_warning}")
                except Exception as sudo_check_e:
                     admin_warning = f"Lỗi khi kiểm tra sudo ({sudo_check_e}). Thực thi với quyền thường."
                     print(f"[LỖI] {admin_warning}")
            else:
                admin_warning = f"Yêu cầu 'Run as Admin/Root' không được hỗ trợ rõ ràng trên HĐH này ({backend_os}). Thực thi với quyền thường."
                print(f"[CẢNH BÁO] {admin_warning}")

        print(f"[INFO] Chuẩn bị chạy lệnh: {' '.join(shlex.quote(str(c)) for c in command)}")
        process_env = os.environ.copy()
        process_env["PYTHONIOENCODING"] = "utf-8"

        result = subprocess.run(
            command, capture_output=True, encoding='utf-8', errors='replace',
            timeout=60, check=False, env=process_env, text=True
        )
        output = result.stdout
        error_output = result.stderr
        return_code = result.returncode

        print(f"--- Kết quả thực thi file (Mã trả về: {return_code}) ---")
        if output: print(f"Output:\n{output}")
        if error_output: print(f"Lỗi Output:\n{error_output}")
        print(f"----------------------------------------------")

        message = "Thực thi file thành công." if return_code == 0 else "Thực thi file hoàn tất (có thể có lỗi)."
        response_data = {
            "message": message, "output": output, "error": error_output, "return_code": return_code,
            "executed_file_type": file_extension,
            "codeThatFailed": code_to_execute
        }
        if admin_warning:
            response_data["warning"] = admin_warning
        return jsonify(response_data)

    except subprocess.TimeoutExpired:
        print("Lỗi: Thực thi file vượt quá thời gian cho phép (60 giây).")
        return jsonify({"error": "Thực thi file vượt quá thời gian cho phép.", "output": "", "error": "Timeout", "return_code": -1, "warning": admin_warning, "codeThatFailed": code_to_execute}), 408
    except FileNotFoundError as fnf_error:
        missing_cmd = str(fnf_error)
        err_msg = f"Lỗi hệ thống: Không tìm thấy lệnh cần thiết '{missing_cmd}' để chạy file .{file_extension}."
        if 'sudo' in missing_cmd and run_as_admin and backend_os != "windows":
             err_msg = "Lỗi hệ thống: Lệnh 'sudo' không được tìm thấy. Không thể chạy với quyền root."
        print(f"[LỖI] {err_msg}")
        return jsonify({"error": err_msg, "output": "", "error": f"FileNotFoundError: {missing_cmd}", "return_code": -1, "warning": admin_warning, "codeThatFailed": code_to_execute}), 500
    except Exception as e:
        print(f"Lỗi nghiêm trọng khi thực thi file tạm: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return jsonify({"error": f"Lỗi hệ thống khi thực thi file: {e}", "output": "", "error": str(e), "return_code": -1, "warning": admin_warning, "codeThatFailed": code_to_execute}), 500
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                print(f"[INFO] Đã xóa file tạm: {temp_file_path}")
            except Exception as cleanup_e:
                print(f"[LỖI] Không thể xóa file tạm {temp_file_path}: {cleanup_e}")


# Endpoint để gỡ lỗi cod
@app.route('/api/debug', methods=['POST'])
def handle_debug():
    data = request.get_json()
    original_prompt = data.get('prompt', '(Không có prompt gốc)')
    failed_code = data.get('code')
    stdout = data.get('stdout', '')
    stderr = data.get('stderr', '')
    model_config = data.get('model_config', {})
    # Nhận loại file gây lỗi từ frontend
    file_type = data.get('file_type', 'py')

    if not failed_code:
        return jsonify({"error": "Thiếu mã lỗi để gỡ rối."}), 400

    # Đảm bảo file_type chỉ là extension
    language_extension = file_type.split('.')[-1].lower() if '.' in file_type else file_type.lower()
    if not language_extension: language_extension = 'py'

    full_prompt = create_debug_prompt(original_prompt, failed_code, stdout, stderr, language_extension)
    raw_response = generate_response_from_gemini(full_prompt, model_config.copy(), is_for_review_or_debug=True)

    if raw_response and not raw_response.startswith("Lỗi"):
        explanation_part = raw_response
        corrected_code = None
        suggested_package = None

        # Chỉ tìm đề xuất pip install NẾU ngôn ngữ là Python
        if language_extension == 'py':
            install_match = re.search(r"```bash\s*pip install\s+([\w\-==\.]+)\s*```", explanation_part, re.IGNORECASE)
            if install_match:
                suggested_package = install_match.group(1).strip()
                print(f"Debug (Python): Phát hiện đề xuất cài đặt package: {suggested_package}")
                explanation_part = explanation_part[:install_match.start()].strip() + explanation_part[install_match.end():].strip()

        # Tìm khối mã cuối cùng
        last_code_block_match = None
        code_block_tag = language_extension if language_extension.isalnum() else 'code'
        patterns_to_try = [r"```" + re.escape(code_block_tag) + r"\s*([\s\S]*?)\s*```"]
        # Thêm các alias phổ biến
        if language_extension == 'py': patterns_to_try.append(r"```python\s*([\s\S]*?)\s*```")
        if language_extension == 'sh': patterns_to_try.append(r"```bash\s*([\s\S]*?)\s*```")
        if language_extension == 'bat': patterns_to_try.append(r"```batch\s*([\s\S]*?)\s*```")
        if language_extension == 'ps1': patterns_to_try.append(r"```powershell\s*([\s\S]*?)\s*```")
        patterns_to_try.append(r"```\s*([\s\S]*?)\s*```") # Fallback

        for pattern in patterns_to_try:
             matches = list(re.finditer(pattern, explanation_part, re.IGNORECASE | re.MULTILINE))
             if matches:
                 last_code_block_match = matches[-1]
                 print(f"Debug: Found corrected code block using pattern: {pattern}")
                 break

        if last_code_block_match:
            start_index = last_code_block_match.start()
            potential_explanation_before_code = explanation_part[:start_index].strip()
            if potential_explanation_before_code:
                 explanation_part = potential_explanation_before_code
            else:
                 explanation_part = f"(AI chỉ trả về code {get_language_name(language_extension)} đã sửa lỗi, không có giải thích)"
            corrected_code = last_code_block_match.group(1).strip()

        explanation_part = re.sub(r"^(Phân tích và đề xuất:|Giải thích và đề xuất:|Phân tích:|Giải thích:)\s*", "", explanation_part, flags=re.IGNORECASE | re.MULTILINE).strip()

        return jsonify({
            "explanation": explanation_part if explanation_part else "(Không có giải thích)",
            "corrected_code": corrected_code,
            "suggested_package": suggested_package,
            "original_language": language_extension # Trả về ngôn ngữ gốc để frontend biết
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

    # Thêm kiểm tra tên package chặt chẽ hơn chút
    if not re.fullmatch(r"^[a-zA-Z0-9\-_==\.\+]+$", package_name.replace('[','').replace(']','')): # Allow versions, extras
        print(f"[CẢNH BÁO] Tên package không hợp lệ bị từ chối: {package_name}")
        return jsonify({"success": False, "error": f"Tên package không hợp lệ: {package_name}"}), 400

    print(f"--- Chuẩn bị cài đặt package: {package_name} ---")
    # Sử dụng shlex.split để xử lý tên package có thể chứa dấu cách hoặc ký tự đặc biệt (ít gặp nhưng an toàn hơn)
    try:
        pip_command_parts = [sys.executable, '-m', 'pip', 'install'] + shlex.split(package_name)
        # Loại bỏ các phần tử rỗng nếu có sau khi split
        command = [part for part in pip_command_parts if part]
    except Exception as parse_err:
        print(f"[LỖI] Không thể phân tích tên package: {package_name} - {parse_err}")
        return jsonify({"success": False, "error": f"Tên package không hợp lệ: {package_name}"}), 400


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
            # Cố gắng lấy dòng lỗi cuối cùng hoặc một phần lỗi chính
            detailed_error = error_output.strip().split('\n')[-1] if error_output.strip() else f"Lệnh Pip thất bại với mã trả về {return_code}."
            return jsonify({ "success": False, "message": message, "output": output, "error": detailed_error }), 500 # Trả 500 khi pip lỗi

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


# Endpoint để giải thích nội dung 
@app.route('/api/explain', methods=['POST'])
def handle_explain():
    data = request.get_json()
    content_to_explain = data.get('content')
    context = data.get('context', 'unknown')
    model_config = data.get('model_config', {})
    # Nhận loại file/ngôn ngữ từ frontend nếu context là code
    file_type = data.get('file_type') # Extension: py, sh, bat...

    if not content_to_explain:
        return jsonify({"error": "Không có nội dung để giải thích."}), 400

    if isinstance(content_to_explain, dict) or isinstance(content_to_explain, list):
         try: content_to_explain = json.dumps(content_to_explain, ensure_ascii=False, indent=2)
         except Exception: content_to_explain = str(content_to_explain)
    else:
        content_to_explain = str(content_to_explain) 

    # Sử dụng context 'code' chung và truyền language nếu có
    explain_context = 'code' if context == 'python_code' else context
    language_for_prompt = file_type if explain_context == 'code' else None

    full_prompt = create_explain_prompt(content_to_explain, explain_context, language=language_for_prompt)
    explanation_text = generate_response_from_gemini(full_prompt, model_config.copy(), is_for_review_or_debug=True)

    if explanation_text and not explanation_text.startswith("Lỗi"):
        return jsonify({"explanation": explanation_text})
    elif explanation_text:
        status_code = 400 if ("Lỗi cấu hình" in explanation_text or "Lỗi: Phản hồi bị chặn" in explanation_text) else 500
        return jsonify({"error": explanation_text}), status_code
    else:
        return jsonify({"error": "Không thể tạo giải thích hoặc có lỗi không xác định xảy ra."}), 500


if __name__ == '__main__':
    print("Backend đang chạy tại http://localhost:5001")
    if sys.platform == "win32":
        try:
            is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
            if is_admin:
                print("[INFO] Backend đang chạy với quyền Administrator.")
            else:
                print("[INFO] Backend đang chạy với quyền User thông thường.")
        except Exception:
            print("[CẢNH BÁO] Không thể kiểm tra quyền admin khi khởi động.")

    app.run(debug=True, port=5001)

# Đang thi công........