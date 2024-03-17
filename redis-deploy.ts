#!/usr/bin/env -S deno run -A
import $ from "dax";

export const IMAGE = "redis:7.2.4";
export const PORT = 6379;
export const NETWORK = "redis";

/**
 * https://redis.io/docs/management/replication/
 * @param replicas
 */
export async function deploy(replicas: number) {
  await $`./docker-clean.sh`;

  await $`docker network create ${NETWORK}`.noThrow();

  for (let i = 0; i < replicas; i++) {
    await $`docker run --name redis-${i} -d
            -p ${PORT + i}:${PORT}
            --net ${NETWORK}
            ${IMAGE}`;
    if (i > 0) {
      await $`docker exec redis-${i} redis-cli REPLICAOF redis-0 ${PORT}`;
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
