import { Repository } from "./Repository";

async function main() {
    var r = new Repository(process.argv[2]);
    await r.buildManifest();
}

main();