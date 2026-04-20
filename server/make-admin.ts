import Database from "better-sqlite3";

const sqlite = new Database("forum.db");
sqlite.exec(`UPDATE users SET role = 'admin' WHERE username = 'Admin'`);
console.log("Done — Admin user promoted to admin role.");
sqlite.close();
