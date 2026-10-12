import sys,json,sqlite3
db=sqlite3.connect(sys.argv[1]);db.row_factory=sqlite3.Row
d=json.load(sys.stdin);cur=db.execute(d['sql'],d['args']);rows=[dict(x) for x in cur.fetchall()] if cur.description else []
db.commit();print(json.dumps(rows))
