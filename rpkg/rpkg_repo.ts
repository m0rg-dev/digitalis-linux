import { Repository } from "./repo";
import * as path from 'path';

async function main() {
    var r = new Repository(path.join(__dirname, "..", "repository"));
    await r.buildManifest();
}

main();