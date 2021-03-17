import { Environment } from "./Environment";
import Bootstrap from "./pkgs/Bootstrap";

const main = async () => {
    const env = new Environment([{
        exact: new Bootstrap()
    }]);
    if (!(await env.resolve())) throw new Error(`Couldn't resolve environment!`);
    console.log(env);
    await env.construct();
    console.log(env);
};

main();