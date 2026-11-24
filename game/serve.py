from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import mimetypes


mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/csv", ".csv")
project_root = Path(__file__).resolve().parent.parent
handler = partial(SimpleHTTPRequestHandler, directory=project_root)

print("RHL Career running at http://127.0.0.1:4173/game/index.html")
ThreadingHTTPServer(("127.0.0.1", 4173), handler).serve_forever()
