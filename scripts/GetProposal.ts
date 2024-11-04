// noinspection DuplicatedCode

import { createPublicClient, http, hexToString } from "viem";
import { sepolia } from "viem/chains";
import { abi } from "../artifacts/contracts/Ballot.sol/Ballot.json";
import * as dotenv from "dotenv";
dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";

const PROPOSAL_NAME_IDX = 0;
const PROPOSAL_VOTES_IDX = 1;

async function main() {
  // Fetch parameters
  const ARG_PROPOSAL_NO_IDX = 0;
  const ARG_CONTRACT_ADDRESS_IDX = 1;
  const parameters = process.argv.slice(2);
  const proposalIndex = parameters[ARG_PROPOSAL_NO_IDX];
  const contractAddress = parameters[ARG_CONTRACT_ADDRESS_IDX] as `0x${string}`;

  if (!parameters || parameters.length < 2)
    throw new Error(
      "Parameters not provided. You must provide proposal and contract address",
    );

  if (isNaN(Number(proposalIndex))) throw new Error("Invalid proposal index");

  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress.toLowerCase()))
    throw new Error("Invalid contract address provided.");

  console.log(
    "scripts -> GetProposals -> contract",
    contractAddress,
    "proposal",
    proposalIndex,
  );
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
  const blockNumber = await publicClient.getBlockNumber();
  console.log("scripts -> GetProposals -> last block number", blockNumber);

  const proposal = (await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: "proposals",
    args: [BigInt(proposalIndex!)],
  })) as any[];
  const name = hexToString(proposal[PROPOSAL_NAME_IDX], { size: 32 });
  const votes = BigInt(proposal[PROPOSAL_VOTES_IDX]).valueOf();
  console.log(
    "scripts -> GetProposals -> name",
    name,
    "votes",
    votes,
    Number(votes),
  );
}

main().catch((error) => {
  const message =
    error instanceof Error
      ? ("reason" in error && error.reason) || error.message
      : "";
  console.error("scripts -> failed with error ->", message);
  // console.log("\n\nError details:");
  // console.error(error);
  process.exitCode = 1;
});
