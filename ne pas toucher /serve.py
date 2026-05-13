import os, http.server, socketserver

os.chdir("/Users/lorik/Desktop/pilotia")
PORT = 8080
Handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()
