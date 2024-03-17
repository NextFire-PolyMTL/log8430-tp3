#!/usr/bin/env -S deno run -A
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";
import { NETWORK, PORT, REPL_SET } from "./mongodb-deploy.ts";

const NB_RUNS = 10;

async function main(replicas: number) {
  const hosts: string[] = [];
  for (let i = 0; i < replicas; i++) {
    hosts.push(`mongodb-${i}:${PORT}`);
  }
  const args = `-s -p mongodb.url=mongodb://${hosts}/?replicaSet=${REPL_SET}`;

  console.log("--- Chargement initial");
  await $`./ycsb.sh ${NETWORK} load mongodb ${args} -P workloads/workloada`;

  for (let i = 1; i <= NB_RUNS; i++) {
    console.log(`--- [${i}/${NB_RUNS}] Uniquement en lecture`);
    await $`./ycsb.sh ${NETWORK} run mongodb ${args} -P workloads/workloadc`;
    console.log(`--- [${i}/${NB_RUNS}] 50/50 en lecture/écriture`);
    await $`./ycsb.sh ${NETWORK} run mongodb ${args} -P workloads/workloada`;
    console.log(`--- [${i}/${NB_RUNS}] 10/90 lecture/écriture`);
    await $`./ycsb.sh ${NETWORK} run mongodb ${args} -P workloads/workloada -p readproportion=0.1 -p updateproportion=0.9`;
  }
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
