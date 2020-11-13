import { RPMDatabase } from "./RPMDatabase";

async function main() {
    await RPMDatabase.rebuild();
    // console.log(RPMDatabase.provider_db);
    // console.log(RPMDatabase.dist_name_to_version);
    // console.log(RPMDatabase.dist_file_to_spec);

    console.log(await RPMDatabase.getBuildDependencies("../rpmbuild/SPECS/base-system.spec", "digi1", "fc33"));
    console.log(await RPMDatabase.getInstallDependencies("../rpmbuild/SPECS/base-system.spec", "digi1"));
}

try {
    main();
} catch (e) {
    console.error(e);
}