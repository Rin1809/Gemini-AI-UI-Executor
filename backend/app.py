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

load_dotenv(dotenv_path='../.env')

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

# --- Cấu hình Gemini ---
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    print("Lỗi: Biến môi trường GOOGLE_API_KEY chưa được thiết lập trong file .env.")
    sys.exit(1)

try:
    genai.configure(api_key=GOOGLE_API_KEY)
except Exception as e:
    print(f"Lỗi khi cấu hình Gemini với API Key: {e}")
    sys.exit(1)
# -----------------------

# --- mapping safety settings ---
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
#---------------------------------------------

# --- Hàm tạo prompt Generate ---
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
...
        print("Đã mở Control Panel.")
    except Exception as e:
        print(f"Lỗi khi mở Control Panel: {{e}}")
else:
    print(f"Lệnh 'control' thường dùng trên Windows.")
```

Ví dụ yêu cầu: Tạo thư mục 'temp_folder' trên Desktop
Mã trả về (ví dụ cho Windows):
```python

....
    print(f"Đã tạo hoặc đã tồn tại thư mục: {{temp_dir}}")
except Exception as e:
    print(f"Lỗi khi tạo thư mục: {{e}}")

```

Yêu cầu của người dùng: "{user_input}"

Chỉ cung cấp khối mã Python cuối cùng:
"""
    return prompt

# --- Hàm tạo prompt Review ---
def create_review_prompt(code_to_review):
    prompt = f"""
Bạn là một chuyên gia đánh giá code Python. Hãy phân tích đoạn mã sau đây và đưa ra nhận xét về:
1.  **Độ an toàn:** Liệu mã có chứa các lệnh nguy hiểm không? Rủi ro?
2.  **Tính đúng đắn:** Mã có thực hiện đúng yêu cầu dự kiến không? Lỗi?
3.  **Tính hiệu quả/Tối ưu:** Có cách viết tốt hơn không?
4.  **Khả năng tương thích:** Chạy được trên các OS khác không?

Đoạn mã cần đánh giá:
```python
{code_to_review}
```

**QUAN TRỌNG:** Chỉ trả về phần văn bản nhận xét/đánh giá bằng Markdown. KHÔNG bao gồm các câu dẫn như "Đây là đánh giá của tôi:", "Phân tích code:", hoặc các bước suy nghĩ/trung gian. Bắt đầu trực tiếp bằng nội dung đánh giá. Định dạng các khối mã ví dụ (nếu có) trong Markdown bằng ```python ... ```.
"""
    return prompt

# --- Hàm tạo prompt Debug ---
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
c.  **Đề xuất Hành động:** Nếu lỗi do thiếu thư viện hoặc cấu hình môi trường, hãy đề xuất *lệnh cụ thể* người dùng cần chạy thủ công trong một khối mã riêng (ví dụ: ```bash\npip install <tên_thư_viện>\n```). KHÔNG bao gồm lệnh cài đặt trong khối mã Python sửa lỗi.
d.  **Sửa lỗi Code:** Nếu lỗi có thể sửa trực tiếp trong mã Python, hãy cung cấp phiên bản mã đã sửa lỗi trong khối ```python ... ``` CUỐI CÙNG. Nếu không thể sửa lỗi trong code (ví dụ: lỗi logic phức tạp, lỗi môi trường), hãy giải thích tại sao và không cần cung cấp khối mã sửa lỗi.

**QUAN TRỌNG:**
*   Trả về phần giải thích và đề xuất hành động (bằng Markdown) trước.
*   Sau đó, nếu có thể sửa code, cung cấp khối mã ```python ... ``` CUỐI CÙNG chứa code đã sửa. Không thêm lời dẫn hay giải thích nào khác sau khối mã này.
*   Nếu không sửa được code, chỉ cần giải thích.

**Phân tích và đề xuất:**
"""
    return prompt
# --------------------------------

# --- Hàm gọi Gemini ---
def generate_response_from_gemini(full_prompt, model_config, is_for_review_or_debug=False):
    try:
        model_name = model_config.get('model_name', 'gemini-1.5-flash')
        if not model_name:
            model_name = 'gemini-1.5-flash'
            print("Cảnh báo: Tên model rỗng, sử dụng model mặc định 'gemini-1.5-flash'.")

        temperature = model_config.get('temperature', 0.7)
        top_p = model_config.get('top_p', 1.0)
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

        raw_text = response.text.strip()

        # Dọn dẹp output nếu là review hoặc debug
        if is_for_review_or_debug and raw_text:
             lines = raw_text.splitlines()
             cleaned_lines = []
             prefixes_to_remove = (
                 "đây là đánh giá", "here is the review", "phân tích code",
                 "review:", "analysis:", "đây là phân tích", "here is the analysis",
                 "giải thích và đề xuất:", "phân tích và đề xuất:",
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
             # Bỏ ``` ở cuối nếu là review/debug mà không có code block theo sau
             # tabun không cần thiết nếu logic tách code ở /api/debug hoạt động tốt
             # if final_text.endswith("```"):
             #    final_text = final_text[:-3].strip()
             return final_text

        return raw_text

    except Exception as e:
        error_message = str(e)
        print(f"Lỗi khi gọi Gemini API ({model_name}): {error_message}", file=sys.stderr)
        # rõ bug hơn2
        if "API key not valid" in error_message:
             return "Lỗi cấu hình: API key không hợp lệ. Vui lòng kiểm tra file .env."
        elif "Could not find model" in error_message or "permission denied" in error_message.lower():
             return f"Lỗi cấu hình: Không tìm thấy hoặc không có quyền truy cập model '{model_name}'."
        elif "invalid" in error_message.lower() and any(p in error_message.lower() for p in ["temperature", "top_p", "top_k", "safety_settings"]):
             return f"Lỗi cấu hình: Giá trị tham số (Temperature/TopP/TopK/Safety) không hợp lệ. ({error_message})"
        elif "Deadline Exceeded" in error_message or "timeout" in error_message.lower():
             return f"Lỗi mạng: Yêu cầu tới Gemini API bị timeout. Vui lòng thử lại."
        elif "SAFETY" in error_message.upper(): # Lỗi chung về safety
             return f"Lỗi: Yêu cầu hoặc phản hồi có thể vi phạm chính sách an toàn của Gemini. ({error_message})"
        # Lỗi chung khác
        return f"Lỗi máy chủ khi gọi Gemini: {error_message}"
# ----------------------------------

# --- Hàm trích xuất code (Lấy khối cuối cùng) ---
def extract_python_code(raw_text):
    # Ưu tiên tìm ```python ... ``` cuối cùng
    matches_python = list(re.finditer(r"```python\s*([\s\S]*?)\s*```", raw_text))
    if matches_python:
        return matches_python[-1].group(1).strip()

    # Nếu không có, thử tìm ``` ... ``` cuối cùng
    matches_generic = list(re.finditer(r"```\s*([\s\S]*?)\s*```", raw_text))
    if matches_generic:
        # Kiểm tra sơ bộ xem có phải code python không (tùy chọn)
        last_block = matches_generic[-1].group(1).strip()

        #    return last_block
        # Trả về khối cuối cùng bất kể ngôn ngữ
        return last_block

    print("Cảnh báo: Không tìm thấy khối mã ```python ... ``` hoặc ``` ... ``` trong phản hồi.")
    # Trả về text gốc nếu không tìm thấy, để người dùng tự xem xét
    return raw_text.strip()
# --------------------------------

# --- Endpoint Generate ---
@app.route('/api/generate', methods=['POST'])
def handle_generate():
    data = request.get_json()
    user_input = data.get('prompt')
    model_config = data.get('model_config', {})

    if not user_input:
        return jsonify({"error": "Vui lòng nhập yêu cầu."}), 400

    full_prompt = create_prompt(user_input)
    raw_response = generate_response_from_gemini(full_prompt, model_config, is_for_review_or_debug=False)

    if raw_response and not raw_response.startswith("Lỗi:"):
        generated_code = extract_python_code(raw_response)

        # Kiểm tra lại xem có phải code không / này cho python thôi
        if not generated_code.strip() or ("```" in generated_code and not generated_code.startswith("import ") and not generated_code.startswith("#")):
             print(f"Trích xuất code có thể không thành công. Kết quả: {generated_code}")


        # Kiểm tra từ khóa nguy hiểm (cơ bản)
        potentially_dangerous = ["rm ", "del ", "format ", "shutdown ", "reboot ", "sys.exit(", "rmdir"]
        code_lower = generated_code.lower()
        detected_dangerous = [kw for kw in potentially_dangerous if kw in code_lower]
        if detected_dangerous:
            print(f"Cảnh báo: Mã tạo ra chứa từ khóa có thể nguy hiểm: {detected_dangerous}")
            # Không chặn, chỉ ghi log ở backend

        return jsonify({"code": generated_code})
    elif raw_response: # Lỗi từ Gemini
        status_code = 400 if ("Lỗi cấu hình" in raw_response or "Lỗi: Phản hồi bị chặn" in raw_response) else 500
        return jsonify({"error": raw_response}), status_code
    else: 
        return jsonify({"error": "Không thể tạo mã hoặc có lỗi không xác định xảy ra."}), 500

# --- Endpoint Review ---
@app.route('/api/review', methods=['POST'])
def handle_review():
    data = request.get_json()
    code_to_review = data.get('code')
    model_config = data.get('model_config', {})

    if not code_to_review:
        return jsonify({"error": "Không có mã nào để đánh giá"}), 400

    full_prompt = create_review_prompt(code_to_review)
    review_text = generate_response_from_gemini(full_prompt, model_config, is_for_review_or_debug=True)

    if review_text and not review_text.startswith("Lỗi:"):
        return jsonify({"review": review_text})
    elif review_text: # Lỗi từ Gemini
        status_code = 400 if ("Lỗi cấu hình" in review_text or "Lỗi: Phản hồi bị chặn" in review_text) else 500
        return jsonify({"error": review_text}), status_code
    else:
        return jsonify({"error": "Không thể đánh giá mã hoặc có lỗi không xác định xảy ra."}), 500

# --- Endpoint Execute ---
@app.route('/api/execute', methods=['POST'])
def handle_execute():
    data = request.get_json()
    code_to_execute = data.get('code')

    if not code_to_execute:
        return jsonify({"error": "Không có mã nào để thực thi"}), 400

    print(f"--- CẢNH BÁO: Chuẩn bị thực thi mã sau ---")
    print(code_to_execute)
    print(f"-------------------------------------------")

    try:
        process_env = os.environ.copy()
        process_env["PYTHONIOENCODING"] = "utf-8" # Đảm bảo Python dùng UTF-8 cho IO

        # Sử dụng sys.executable để đảm bảo chạy bằng Python của môi trường ảo hiện tại
        result = subprocess.run(
            [sys.executable, '-c', code_to_execute],
            capture_output=True, # Bắt cả stdout và stderr
            encoding='utf-8',    # Decode output bằng UTF-8
            errors='replace',    # Thay thế ký tự không hợp lệ
            timeout=30,          # Tăng timeout lên 30 giây
            check=False,         # Không raise exception nếu exit code != 0
            env=process_env,     # Truyền môi trường đã chỉnh sửa
            text=True            # Đảm bảo stdout/stderr là text
        )

        output = result.stdout
        error_output = result.stderr
        return_code = result.returncode

        print(f"--- Kết quả thực thi (Return Code: {return_code}) ---")
        if output: print(f"Output:\n{output}")
        if error_output: print(f"Error Output:\n{error_output}")
        print(f"-----------------------------------------")

        message = "Thực thi thành công." if return_code == 0 else "Thực thi hoàn tất với lỗi."

        return jsonify({
            "message": message,
            "output": output,
            "error": error_output,
            "return_code": return_code
        })

    except subprocess.TimeoutExpired:
        print("Lỗi: Thực thi mã vượt quá thời gian cho phép (30 giây).")
        return jsonify({"error": "Thực thi mã vượt quá thời gian cho phép.", "output": "", "error": "Timeout", "return_code": -1}), 408 # Request Timeout
    except FileNotFoundError:
         print(f"Lỗi: Không tìm thấy trình thông dịch Python tại '{sys.executable}'.")
         return jsonify({"error": f"Lỗi hệ thống: Không tìm thấy Python interpreter.", "output": "", "error": f"FileNotFoundError: {sys.executable}", "return_code": -1}), 500
    except Exception as e:
        print(f"Lỗi nghiêm trọng khi thực thi mã: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return jsonify({"error": f"Lỗi hệ thống khi thực thi mã: {e}", "output": "", "error": str(e), "return_code": -1}), 500

# --- Endpoint Debug ---
@app.route('/api/debug', methods=['POST'])
def handle_debug():
    data = request.get_json()
    original_prompt = data.get('prompt', '(Không có prompt gốc)') # Lấy prompt gốc, có giá trị mặc định
    failed_code = data.get('code')
    stdout = data.get('stdout', '')
    stderr = data.get('stderr', '')
    model_config = data.get('model_config', {})

    if not failed_code:
        return jsonify({"error": "Thiếu mã lỗi để debug."}), 400
    # Không bắt buộc phải có stderr, vì lỗi có thể chỉ hiện ở stdout hoặc return code != 0
    # if not stderr:
    #     return jsonify({"error": "Thiếu lỗi stderr để debug."}), 400

    full_prompt = create_debug_prompt(original_prompt, failed_code, stdout, stderr)

  
    raw_response = generate_response_from_gemini(full_prompt, model_config, is_for_review_or_debug=True)

    if raw_response and not raw_response.startswith("Lỗi:"):
        explanation_part = raw_response # Ban đầu giả sử toàn bộ là giải thích và...
        corrected_code = None

        # Tìm khối code cuối cùng (Python hoặc generic)
        last_code_block_match = None
        python_matches = list(re.finditer(r"```python\s*([\s\S]*?)\s*```", raw_response))
        if python_matches:
            last_code_block_match = python_matches[-1]
        else:
        
            generic_matches = list(re.finditer(r"```\s*([\s\S]*?)\s*```", raw_response))
            if generic_matches:
                 # Kiểm tra xem có phải là khối lệnh đề xuất (bash, sh, cmd, powershell) không
                 potential_code = generic_matches[-1].group(1).strip()
                 first_line = potential_code.splitlines()[0].lower() if potential_code else ""
                 # Nếu không phải khối lệnh đề xuất, có thể là code Python đã sửa
                 if not any(cmd in first_line for cmd in ["pip install", "apt-get", "yum install"]):
                    last_code_block_match = generic_matches[-1]


        if last_code_block_match:
            start_index = last_code_block_match.start()
            # Kiểm tra xem phần trước đó có thực sự là giải thích không
            potential_explanation = raw_response[:start_index].strip()
            if potential_explanation: # Chỉ tách nếu có nội dung trước khối code
                 explanation_part = potential_explanation
                 corrected_code = last_code_block_match.group(1).strip()
            else: # Nếu không có gì trước khối code, coi như toàn bộ là code 
                 explanation_part = "(AI chỉ trả về code, không có giải thích)"
                 corrected_code = last_code_block_match.group(1).strip()
        else:
             pass


        # Dọn dẹp thêm phần giải thích nếu cần (ví dụ: loại bỏ "Phân tích và đề xuất:")
        explanation_part = re.sub(r"^(Phân tích và đề xuất:|Giải thích và đề xuất:)\s*", "", explanation_part, flags=re.IGNORECASE | re.MULTILINE).strip()


        return jsonify({
            "explanation": explanation_part if explanation_part else "(Không có giải thích)",
            "corrected_code": corrected_code # không tìm thấy thì cho none
        })
    elif raw_response: # Lỗi từ Gemini
        status_code = 400 if ("Lỗi cấu hình" in raw_response or "Lỗi: Phản hồi bị chặn" in raw_response) else 500
        return jsonify({"error": raw_response}), status_code
    else:
        return jsonify({"error": "Không thể thực hiện debug hoặc có lỗi không xác định xảy ra."}), 500
# --------------------

if __name__ == '__main__':
    print("Backend đang chạy tại http://localhost:5001")
    app.run(debug=True, port=5001)