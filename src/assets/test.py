import sys
import requests
multipart_form_data = {
    'wave': ('wav.wav', open(sys.argv[1], 'rb')),
}

response = requests.post('http://202.207.12.156:8000/asr', {'fs': 48000, 'ch': 1}, files=multipart_form_data)

print response.content
