#!/usr/bin/env -S deno run -A
// https://redis.io/docs/management/scaling/
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

export const IMAGE = "redis:7.2.4";
export const PORT = 6379;
export const NETWORK = "redis";

async function main(replicas: number) {
  await $`./docker-clean.sh`;

  await $`docker network create ${NETWORK}`.noThrow();

  const hosts: string[] = [];
  for (let i = 0; i < replicas; i++) {
    await $`docker run --name redis-${i} -d
            -p ${PORT + i}:${PORT}
            --net ${NETWORK}
            -v ${Deno.cwd()}/redis.conf:/usr/local/etc/redis/redis.conf:ro
            ${IMAGE} redis-server /usr/local/etc/redis/redis.conf`;
    hosts.push(`redis-${i}:${PORT}`);
  }

  await $`docker exec redis-0 redis-cli --cluster create ${hosts} --cluster-yes`;
}

if (import.meta.main) {
  const replicas = parseInt(Deno.args[0]);
  if (isNaN(replicas)) {
    console.error(`Usage: ${Deno.mainModule} <replicas>`);
    Deno.exit(1);
  }

  $.setPrintCommand(true);
  await main(replicas);
}
