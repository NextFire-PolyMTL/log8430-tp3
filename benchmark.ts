#!/usr/bin/env -S deno run -A
import $ from "dax";
import * as mongodb from "./mongodb-deploy.ts";
import * as redis from "./redis-deploy.ts";

const REPLICAS = [3, 5];
const WORKLOADS = [
  {
    name: "100_0",
    args: "-P workloads/workloadc",
  },
  {
    name: "50_50",
    args: "-P workloads/workloada",
  },
  {
    name: "10_90",
    args: "-P workloads/workloada -p readproportion=0.1 -p updateproportion=0.9",
  },
];
const REPEAT = 10;

async function benchmark() {
  await Deno.remove("results", { recursive: true }).catch(() => {});
  await Deno.mkdir("results");
  for (const replicas of REPLICAS) {
    await Deno.mkdir(`results/${replicas}`);
    await benchmark_mongodb(replicas);
    await benchmark_redis(replicas);
  }
}

async function benchmark_mongodb(replicas: number) {
  await Deno.mkdir(`results/${replicas}/mongodb`);

  console.log(`--- MongoDB ${replicas} replicas, deploy`);
  await mongodb.deploy(replicas);

  const hosts: string[] = [];
  for (let i = 0; i < replicas; i++) {
    hosts.push(`mongodb-${i}:${mongodb.PORT}`);
  }
  const config = `-p mongodb.url=mongodb://${hosts}/?replicaSet=${mongodb.REPL_SET}`;
  await run_benchmark("mongodb", replicas, mongodb.NETWORK, config);
}

async function benchmark_redis(replicas: number) {
  await Deno.mkdir(`results/${replicas}/redis`);

  console.log(`--- Redis ${replicas} replicas, deploy`);
  await redis.deploy(replicas);

  const config = `-s -p redis.host=redis-0 -p redis.port=${redis.PORT}`;
  await run_benchmark("redis", replicas, redis.NETWORK, config);
}

async function run_benchmark(
  dbName: string,
  replicas: number,
  network: string,
  config: string
) {
  console.log(`--- ${dbName} ${replicas} replicas, load`);
  await $`./ycsb.sh ${network} load ${dbName} ${config} -P workloads/workloada`;

  for (const workload of WORKLOADS) {
    await Deno.mkdir(`results/${replicas}/${dbName}/${workload.name}`);
    for (let i = 1; i <= REPEAT; i++) {
      const iPadded = i.toString().padStart(2, "0");
      console.log(
        `--- ${dbName} ${replicas} replicas, ${workload.name} workload, run ${iPadded}/${REPEAT}`
      );
      const save = `results/${replicas}/${dbName}/${workload.name}/${iPadded}.csv`;
      await $`./ycsb.sh ${network} run ${dbName} ${config} ${workload.args}`.stdout(
        $.path(save)
      );
    }
  }
}

if (import.meta.main) {
  $.setPrintCommand(true);
  try {
    await benchmark();
  } finally {
    await $`./docker-clean.sh`;
  }
}
