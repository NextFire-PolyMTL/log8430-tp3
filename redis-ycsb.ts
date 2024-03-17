#!/usr/bin/env -S deno run -A
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";
import { NETWORK, PORT } from "./redis-deploy.ts";

const NB_RUNS = 10;

async function main() {
  const args = `-s -p redis.host=redis-0 -p redis.port=${PORT} -p redis.cluster=true`;

  console.log("--- Chargement initial");
  await $`./ycsb.sh ${NETWORK} load redis ${args} -P workloads/workloada`;

  for (let i = 1; i <= NB_RUNS; i++) {
    console.log(`--- [${i}/${NB_RUNS}] Uniquement en lecture`);
    await $`./ycsb.sh ${NETWORK} run redis ${args} -P workloads/workloadc`;
    console.log(`--- [${i}/${NB_RUNS}] 50/50 en lecture/écriture`);
    await $`./ycsb.sh ${NETWORK} run redis ${args} -P workloads/workloada`;
    console.log(`--- [${i}/${NB_RUNS}] 10/90 lecture/écriture`);
    await $`./ycsb.sh ${NETWORK} run redis ${args} -P workloads/workloada -p readproportion=0.1 -p updateproportion=0.9`;
  }
}

if (import.meta.main) {
  $.setPrintCommand(true);
  await main();
}
