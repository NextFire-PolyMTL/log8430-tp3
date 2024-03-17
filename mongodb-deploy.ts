#!/usr/bin/env -S deno run -A
import $ from "dax";

export const IMAGE = "mongo:7.0.6";
export const PORT = 27017;
export const NETWORK = "mongodb";
export const REPL_SET = "myReplicaSet";

/**
 * https://www.mongodb.com/compatibility/deploying-a-mongodb-cluster-with-docker
 * @param replicas
 */
export async function deploy(replicas: number) {
  await $`./docker-clean.sh`;

  await $`docker network create ${NETWORK}`.noThrow();

  const init = {
    _id: REPL_SET,
    members: [] as { _id: number; host: string }[],
  };
  for (let i = 0; i < replicas; i++) {
    await $`docker run --name mongodb-${i} -d
            -p ${PORT + i}:${PORT}
            --net ${NETWORK}
            ${IMAGE} mongod --replSet ${REPL_SET} --bind_ip localhost,mongodb-${i}`;
    init.members.push({ _id: i, host: `mongodb-${i}` });
  }

  const initStr = JSON.stringify(init);
  await $.raw`docker exec mongodb-0 mongosh --eval 'rs.initiate(${initStr})'`;

  while (true) {
    const status =
      await $`docker exec mongodb-0 mongosh --quiet --eval 'JSON.stringify(rs.status())'`.json();
    const members = status.members as { name: string; stateStr: string }[];
    const states = members.map((m) => m.stateStr);

    const primaryIdx = states.indexOf("PRIMARY");
    if (primaryIdx === -1) {
      console.log("Waiting for all members to be ready...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      break;
    }
  }
}

if (import.meta.main) {
  const replicas = parseInt(Deno.args[0]);
  if (isNaN(replicas)) {
    console.error(`Usage: ${Deno.mainModule} <replicas>`);
    Deno.exit(1);
  }

  $.setPrintCommand(true);
  await deploy(replicas);
}
