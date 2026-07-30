import http.server, socketserver, functools, pathlib
DIRECTORY = str(pathlib.Path(__file__).resolve().parent.parent)
Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIRECTORY)
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", 8117), Handler) as httpd:
    print("serving", DIRECTORY, "on 8117")
    httpd.serve_forever()
