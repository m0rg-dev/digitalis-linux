import { Repository } from "./repo";

async function main() {
    var r = new Repository(process.argv[2]);
    await r.buildManifest();
}

main();