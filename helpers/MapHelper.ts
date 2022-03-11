import { Configurations } from "../models/MapModel";

export const validateParameters = (configurations: Configurations) => {
  console.log(configurations);
  if (
    isNaN(configurations.columns) ||
    isNaN(configurations.minNodes) ||
    isNaN(configurations.maxNodes) ||
    isNaN(configurations.minConnection) ||
    isNaN(configurations.maxConnection)
  ) {
    throw new Error("There's an invalid parameter");
  }

  if (configurations.columns < 1) {
    throw new Error("Number of columns must not be less than 1");
  }

  if (configurations.minNodes < 1) {
    throw new Error("Minimum number of nodes must not be less than 1");
  }

  if (configurations.minConnection < 1) {
    throw new Error(
      "Minimum number of connections per nodes must not be less than 1"
    );
  }

  if (configurations.maxNodes < configurations.minNodes) {
    throw new Error(
      "Maximum number of nodes must not be less than the minimun number of nodes"
    );
  }

  if (configurations.maxConnection < configurations.minConnection) {
    throw new Error(
      "Maximum number of connections per nodes must not be less than the minimun number of connections per nodes"
    );
  }
};

export const getRandomNumber = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const createDistribution = (
  types: string[],
  probabilities: number[]
) => {
  const distribution: string[] = [];

  for (let i = 0; i < types.length; i++) {
    const limit = Math.round(100 * probabilities[i]);

    for (let x = 0; x < limit; x++) {
      distribution.push(types[i]);
    }
  }

  return distribution;
};
