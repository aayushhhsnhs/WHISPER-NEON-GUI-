import os
import subprocess
import uuid
from flask import Flask, render_template, request, jsonify, send_file, url_for
from werkzeug.utils import secure_filename

# Optional GPU detection
try:
    import torch
    DEVICE = "GPU" if torch.backends.mps.is_available() else "CPU"
except Exception:
    DEVICE = "CPU"

app = Flask(__name__)

# =============================
# CONFIG
# =============================
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['OUTPUT_FOLDER'] = 'outputs'
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024

ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'wav', 'mp3', 'm4a', 'flac'}

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

WHISPER_MODELS = ['tiny', 'base', 'small', 'medium', 'large', 'turbo']

LANGUAGES = {
    'Hindi': 'hi',
    'English': 'en',
    'Spanish': 'es',
    'French': 'fr',
    'German': 'de',
    'Chinese': 'zh',
    'Japanese': 'ja',
    'Korean': 'ko',
    'Russian': 'ru',
    'Arabic': 'ar',
    'Portuguese': 'pt',
    'Italian': 'it',
    'Dutch': 'nl',
    'Turkish': 'tr',
    'Polish': 'pl',
    'Vietnamese': 'vi',
    'Thai': 'th',
    'Indonesian': 'id',
    'Urdu': 'ur',
    'Tamil': 'ta',
    'Telugu': 'te',
    'Bengali': 'bn',
    'Marathi': 'mr',
    'Gujarati': 'gu',
    'Punjabi': 'pa'
}

# =============================
# HELPERS
# =============================
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# =============================
# ROUTES
# =============================
@app.route('/')
def index():
    return render_template(
        'index.html',
        models=WHISPER_MODELS,
        languages=LANGUAGES,
        device=DEVICE
    )


# ======================================
# MAIN PROCESS ENDPOINT (UI COMPATIBLE)
# ======================================
@app.route('/process', methods=['POST'])
def process():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    model = request.form.get('model', 'medium')
    task = request.form.get('task', 'transcribe')
    language = request.form.get('language', '')

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400

    # Save upload
    unique_name = str(uuid.uuid4()) + "_" + secure_filename(file.filename)
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
    file.save(input_path)

    # =============================
    # RUN WHISPER
    # =============================
    cmd = ['whisper', input_path, '--model', model]

    if task == 'translate':
        cmd += ['--task', 'translate']

    if language:
        cmd += ['--language', language]

    cmd += ['--output_dir', app.config['OUTPUT_FOLDER']]
    cmd += ['--output_format', 'srt']

    print("Running:", " ".join(cmd))

    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        stdout, stderr = process.communicate()

        print("STDOUT:", stdout)
        print("STDERR:", stderr)

        if process.returncode != 0:
            return jsonify({'error': stderr}), 500

        # =============================
        # FIND OUTPUT SRT
        # =============================
        base = os.path.splitext(os.path.basename(unique_name))[0]

        srt_files = [
            f for f in os.listdir(app.config['OUTPUT_FOLDER'])
            if f.startswith(base) and f.endswith('.srt')
        ]

        if not srt_files:
            return jsonify({'error': 'No SRT generated'}), 500

        srt_files.sort(
            key=lambda x: os.path.getmtime(
                os.path.join(app.config['OUTPUT_FOLDER'], x)
            ),
            reverse=True
        )

        output_file = srt_files[0]

        download_url = url_for(
            'download_file',
            filename=output_file
        )

        return jsonify({
            'success': True,
            'download_url': download_url
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================
# DOWNLOAD
# =============================
@app.route('/download/<filename>')
def download_file(filename):
    path = os.path.join(app.config['OUTPUT_FOLDER'], filename)
    if not os.path.exists(path):
        return jsonify({'error': 'File not found'}), 404

    return send_file(
        path,
        as_attachment=True,
        download_name=filename
    )


# =============================
# RUN
# =============================
if __name__ == '__main__':
    app.run(debug=True, port=5000)