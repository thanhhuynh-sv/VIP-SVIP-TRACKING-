const fs = require("fs");
const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const { initializeApp } = require("@firebase/app");
const { getFirestore, doc, getDoc } = require("@firebase/firestore");

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  const d = await getDoc(doc(db, "students", "fN6Lmsf518qRIsmYg25A"));
  if (d.exists()) {
    console.log("Document data:", JSON.stringify(d.data(), null, 2));
  } else {
    console.log("Document fN6Lmsf518qRIsmYg25A does not exist!");
  }
}

check().catch(console.error);
