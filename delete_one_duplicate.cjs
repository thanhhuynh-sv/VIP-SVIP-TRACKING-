const fs = require("fs");
const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const { initializeApp } = require("@firebase/app");
const { getFirestore, doc, deleteDoc, getDocs, collection } = require("@firebase/firestore");

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function clean() {
  console.log("Deleting duplicate document for Lê Huỳnh Công Nhử (m1DAnp3pQ9hM4N6V1gCv)...");
  await deleteDoc(doc(db, "students", "m1DAnp3pQ9hM4N6V1gCv"));
  console.log("Deleted.");

  const querySnapshot = await getDocs(collection(db, "students"));
  console.log("Remaining students in Firestore:", querySnapshot.size);
}

clean().catch(console.error);
