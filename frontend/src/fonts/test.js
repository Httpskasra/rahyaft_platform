import fs from "fs";

const file = fs.readFileSync("IRANSans.ttf");

const base64 = file.toString("base64");

fs.writeFileSync("IRANSans.base64.ts", `export default "${base64}"`);

console.log("Done");