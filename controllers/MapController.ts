import { Request, Response } from "express";
import { isEmpty, isUndefined } from "lodash";
import { Configurations, Column, Node, ExitNode } from "../models/MapModel";
import {
  validateParameters,
  getRandomNumber,
  createDistribution,
} from "../helpers/MapHelper";

class NodeType {
  private combat: number;
  private eliteCombat: number;
  private camp: number;
  private shop: number;
  private encounter: number;
  private treasure: number;
  private encounterCounter: number;
  private treasureCounter: number;

  public static readonly COMBAT_VALUE: number = 0.5;
  public static readonly ELITE_COMBAT_VALUE: number = 0.1;
  public static readonly CAMP_VALUE: number = 0.1;
  public static readonly SHOP_VALUE: number = 0.15;
  public static readonly ENCOUNTER_VALUE: number = 0.15;
  public static readonly TREASURE_VALUE: number = 0.05;

  constructor() {
    this.combat = 1;
    this.eliteCombat = 0;
    this.camp = 0;
    this.shop = 0;
    this.encounter = 0;
    this.treasure = 0;
    this.encounterCounter = 0;
    this.treasureCounter = 0;
  }

  public getCombat() {
    return this.combat;
  }

  public setCombat(value: number) {
    this.combat = value;
    return this;
  }

  public getEliteCombat() {
    return this.eliteCombat;
  }

  public setEliteCombat(value: number) {
    this.eliteCombat = value;
    return this;
  }

  public getCamp() {
    return this.camp;
  }

  public setCamp(value: number) {
    this.camp = value;
    return this;
  }

  public getShop() {
    return this.shop;
  }

  public setShop(value: number) {
    this.shop = value;
    return this;
  }

  public getEncounter() {
    return this.encounter;
  }

  public setEncounter(value: number) {
    if (this.encounterCounter == 0) {
      this.encounter = value;
    } else {
      this.encounter = 0;
    }
    return this;
  }

  public getTreasure() {
    return this.treasure;
  }

  public setTreasure(value: number) {
    if (this.treasureCounter < 2) {
      this.treasure = value;
    } else {
      this.treasure = 0;
    }
    return this;
  }

  public getEncounterCounter() {
    return this.encounterCounter;
  }

  public setEncounterCounter(value: number) {
    this.encounterCounter = value;

    return this;
  }

  public getTreasureCounter() {
    return this.treasureCounter;
  }

  public setTreasureCounter(value: number) {
    this.treasureCounter = value;

    return this;
  }

  public processData() {
    const total =
      this.combat +
      this.eliteCombat +
      this.camp +
      this.shop +
      this.encounter +
      this.treasure;

    if (total > 1) {
      // If total percentage is exceeding remove excess from combat
      const excess = total - 1;
      this.combat -= excess;
    } else if (total < 1) {
      // If total percentage is lacking, distribute the missing percentage on non 0 types
      const missing = 1 - total;
      const nonZeroCount = this.countNonZero();
      const percentageToBeDistributed = missing / nonZeroCount;
      this.distributeMissingPercentage(percentageToBeDistributed);
    }

    return this;
  }

  public getData() {
    return {
      types: ["combat", "eliteCombat", "camp", "shop", "encounter", "treasure"],
      probabilities: [
        this.combat,
        this.eliteCombat,
        this.camp,
        this.shop,
        this.encounter,
        this.treasure,
      ],
    };
  }

  private countNonZero() {
    let count = 0;
    count += this.combat === 0 ? 0 : 1;
    count += this.eliteCombat === 0 ? 0 : 1;
    count += this.camp === 0 ? 0 : 1;
    count += this.shop === 0 ? 0 : 1;
    count += this.encounter === 0 ? 0 : 1;
    count += this.treasure === 0 ? 0 : 1;

    return count;
  }

  private distributeMissingPercentage(value: number) {
    this.combat = this.combat === 0 ? this.combat : this.combat + value;
    this.eliteCombat =
      this.eliteCombat === 0 ? this.eliteCombat : this.eliteCombat + value;
    this.camp = this.camp === 0 ? this.camp : this.camp + value;
    this.shop = this.shop === 0 ? this.shop : this.shop + value;
    this.encounter =
      this.encounter === 0 ? this.encounter : this.encounter + value;
    this.treasure = this.treasure === 0 ? this.treasure : this.treasure + value;
  }
}

class GameMap {
  noOfColumns: number;
  currentNodeId: number;
  private data: Column[];

  constructor(configurations: Configurations) {
    this.noOfColumns = configurations.columns;
    this.currentNodeId = 0;
    this.data = [];
  }

  public generateColumns = (
    min: number,
    max: number,
    shouldDiffer: boolean
  ) => {
    while (this.data.length < this.noOfColumns) {
      let noOfNodes: number;

      noOfNodes = getRandomNumber(min, max);

      if (!isEmpty(this.data) && shouldDiffer) {
        // If current no. of nodes is the same as the previous no. of nodes, generate a new random no.
        while (noOfNodes === this.data[this.data.length - 1].noOfNodes) {
          noOfNodes = getRandomNumber(min, max);
        }
      }

      const nodes: Node[] = this.getNodes(noOfNodes, this.data.length);

      const column: Column = {
        noOfNodes,
        nodes,
      };

      this.data.push(column);
    }

    return this;
  };

  public generateConnections = (min: number, max: number) => {
    const nodeType = new NodeType();

    let totalNoOfNodes = this.data[0].noOfNodes; // The total no of nodes in the map
    let isThirdColumn = false; // Flag for checking every 3rd column
    let allPaths: any = []; // Storage for all created paths
    let previousPaths: any = []; // Storage for previous paths per column

    const allNodesWithTypes: string[] = []; // Storage for all nodes and their types

    // Loop the columns
    for (let columnIndex = 0; columnIndex < this.noOfColumns; columnIndex++) {
      const currentColumn = this.data[columnIndex];
      isThirdColumn = (columnIndex + 1) % 3 == 0 ? true : false; // Set to true for every 3rd column
      let shopCounter = 0; // Counter for type 'shop'

      // If the loop is not in the last columnIndex, continue generation and adding of connections
      if (columnIndex < this.noOfColumns - 1) {
        previousPaths = allPaths;
        allPaths = [];

        // Set the rules (Column Level)
        this.setRulesColumnLevel(nodeType, columnIndex, isThirdColumn);

        const noOfNodes = this.data[columnIndex].noOfNodes; // No of nodes in the column
        const nextColumnNoOfNodes = this.data[columnIndex + 1].noOfNodes; // No of nodes in the next column

        totalNoOfNodes += nextColumnNoOfNodes; // Add no of nodes from the next column to the total

        const lastNodeOfNextColumn = totalNoOfNodes - 1; // Get the id of the last node from the next column
        const firstNodeOfNextColumn = totalNoOfNodes - nextColumnNoOfNodes; // Get the id of the first node from the next column

        // currentNodeOfNextColumn -> used for getting the last node from the next column that has connection
        // Set the first node from the next column before looping the nodes
        let currentNodeOfNextColumn = firstNodeOfNextColumn;
        // Loop the nodes per column
        for (let nodeIndex = 0; nodeIndex < noOfNodes; nodeIndex++) {
          const currentNode: Node = this.data[columnIndex].nodes[nodeIndex]; // The current node in the column

          // Set the rules (Node Level)
          this.setRulesNodeLevel(
            nodeType,
            nodeIndex,
            noOfNodes,
            isThirdColumn,
            shopCounter
          );

          let noOfConnections = getRandomNumber(min, max); // Generate random number of connections

          // Check if no of connections will exceed the current no of nodes in the next column
          if (
            noOfConnections >
            lastNodeOfNextColumn - currentNodeOfNextColumn + 1
          ) {
            noOfConnections =
              lastNodeOfNextColumn - currentNodeOfNextColumn + 1;
          }

          currentNode.noOfConnections = noOfConnections;
          currentNode.exit_nodes = [];

          // Create a loop per node, based on the no of connections
          for (
            let connectionIndex = 0;
            connectionIndex < noOfConnections;
            connectionIndex++
          ) {
            // Connect the current node to the last node from the next column that has a connection
            const exitNode: ExitNode = {
              exit_nodeid: currentNodeOfNextColumn,
            };

            if (isUndefined(previousPaths[currentNode.id])) {
              if (isUndefined(allPaths[currentNodeOfNextColumn])) {
                allPaths[currentNodeOfNextColumn] = {
                  nodes: [currentNode.id],
                  steps: 1,
                  previousPaths: [],
                };
              } else {
                allPaths[currentNodeOfNextColumn].nodes.push(currentNode.id);
              }
            } else {
              if (isUndefined(allPaths[currentNodeOfNextColumn])) {
                allPaths[currentNodeOfNextColumn] = {
                  nodes: [currentNode.id],
                  steps: previousPaths[currentNode.id].steps + 1,
                  previousPaths: [],
                };
              } else {
                allPaths[currentNodeOfNextColumn].nodes.push(currentNode.id);
              }

              allPaths[currentNodeOfNextColumn].previousPaths[currentNode.id] =
                previousPaths[currentNode.id];
            }

            // If there are remaining nodes from the next column, continue moving to the next one
            if (
              currentNodeOfNextColumn < lastNodeOfNextColumn &&
              connectionIndex < noOfConnections - 1
            ) {
              currentNodeOfNextColumn++;
            }

            currentNode.exit_nodes?.push(exitNode);
          }

          // Set the rules (Path Level)
          this.setRulesPathLevel(
            nodeType,
            previousPaths,
            currentNode,
            allNodesWithTypes,
            currentColumn
          );

          const nodeTypeValue = this.getType(nodeType);
          currentNode.type = nodeTypeValue;

          // Set this node type to the local array
          allNodesWithTypes[currentNode.id] = nodeTypeValue;

          // If the chosen node type is shop, increment the shopCounter
          if (nodeTypeValue === "shop") {
            shopCounter++;
          } else if (nodeTypeValue === "encounter") {
            // If the chosen node type is encounter, generate a random encounter id from 1-20 and increment the encounterCounter
            currentNode.encounterId = getRandomNumber(1, 20);
            nodeType.setEncounterCounter(1);
          } else if (nodeTypeValue === "treasure") {
            const treasureCounter = nodeType.getTreasureCounter() + 1;
            nodeType.setTreasureCounter(treasureCounter);
          }
        }
      } else {
        // This is a separate block for the last column since it won't have connections
        // Set the rules (Column Level)
        this.setRulesColumnLevel(nodeType, columnIndex, isThirdColumn);

        const noOfNodes = this.data[columnIndex].noOfNodes; // No of nodes in the column
        for (let nodeIndex = 0; nodeIndex < noOfNodes; nodeIndex++) {
          const currentNode: Node = this.data[columnIndex].nodes[nodeIndex]; // The current node in the column

          // Set the rules (Node Level)
          this.setRulesNodeLevel(
            nodeType,
            nodeIndex,
            noOfNodes,
            isThirdColumn,
            shopCounter
          );

          // Set the rules (Path Level)
          this.setRulesPathLevel(
            nodeType,
            allPaths,
            currentNode,
            allNodesWithTypes,
            currentColumn
          );

          const nodeTypeValue = this.getType(nodeType);
          currentNode.type = nodeTypeValue;

          // Set this node type to the local array
          allNodesWithTypes[currentNode.id] = nodeTypeValue;

          // If the chosen node type is shop, increment the shopCounter
          if (nodeTypeValue === "shop") {
            shopCounter++;
          } else if (nodeTypeValue === "encounter") {
            // If the chosen node type is encounter, generate a random encounter id from 1-20 and increment the encounterCounter
            currentNode.encounterId = getRandomNumber(1, 20);
            nodeType.setEncounterCounter(1);
          } else if (nodeTypeValue === "treasure") {
            const treasureCounter = nodeType.getTreasureCounter() + 1;
            nodeType.setTreasureCounter(treasureCounter);
          }
        }
      }
    }
    return this;
  };

  public getData = () => {
    return this.data;
  };

  private getNodes = (noOfNodes: number, columnId: number) => {
    const nodes: Node[] = [];
    for (let i = 0; i < noOfNodes; i++) {
      const node: Node = {
        id: this.currentNodeId,
        columnBasedId: columnId + 1 + "-" + i,
        type: "",
        noOfConnections: 0,
      };

      this.currentNodeId++;
      nodes.push(node);
    }

    return nodes;
  };

  private getType = (nodeType: NodeType) => {
    // The current types data with given rules
    const typesData = nodeType.processData().getData();
    // The distributed types data on array based on probabilities
    const distributedTypes = createDistribution(
      typesData.types,
      typesData.probabilities
    );
    const distributedTypesCount = distributedTypes.length;
    const randomIndex = getRandomNumber(1, distributedTypesCount) - 1;
    // The selected type chosen by a random number
    const selectedType = distributedTypes[randomIndex];

    return selectedType;
  };

  private setRulesColumnLevel = (
    nodeType: NodeType,
    columnIndex: number,
    isThirdColumn: boolean
  ) => {
    // Rule for Types - If not the first column then set the corresponding properties for the following types;
    if (columnIndex > 0) {
      // combat to 50%, encounter to 15%, treasure to 5%;
      nodeType
        .setCombat(NodeType.COMBAT_VALUE)
        .setEncounter(NodeType.ENCOUNTER_VALUE)
        .setTreasure(NodeType.TREASURE_VALUE);
    }

    // Rule for Types (eliteCombat) - If column is 5th or so on, set the probability of eliteCombat to 10%
    if (columnIndex >= 4) {
      nodeType.setEliteCombat(NodeType.ELITE_COMBAT_VALUE);
    }

    // Rule for Types (shop) - For every 3rd column, set the probability of shop to 15%
    if (isThirdColumn) {
      nodeType.setShop(NodeType.SHOP_VALUE);
    } else {
      nodeType.setShop(0);
    }
  };

  private setRulesNodeLevel = (
    nodeType: NodeType,
    nodeIndex: number,
    noOfNodes: number,
    isThirdColumn: boolean,
    shopCounter: number
  ) => {
    // Rule for Types (shop) - If there are 2 shop types already for this column, set the probability of shop back to 0%
    if (shopCounter >= 2) {
      nodeType.setShop(0);
    } else if (
      isThirdColumn &&
      shopCounter === 0 &&
      nodeIndex === noOfNodes - 1
    ) {
      // If it is the last node in every 3rd column and still no shop type, set the probability of shop to 100% and the others to 0%
      nodeType
        .setShop(1)
        .setCombat(0)
        .setEliteCombat(0)
        .setCamp(0)
        .setEncounter(0)
        .setTreasure(0);
    }

    // Rule for Types (encounter) - If there is already an encounter type, set the probability of encounter back to 0%
    if (nodeType.getEncounterCounter() > 0) {
      nodeType.setEncounter(0);
    }

    // Rule for Types (treasure) - If there is already 2 treasure type, set the probability of treasure back to 0%
    if (nodeType.getTreasureCounter() >= 2) {
      nodeType.setTreasure(0);
    }
  };

  private setRulesPathLevel = (
    nodeType: NodeType,
    paths: any,
    currentNode: Node,
    allNodesWithTypes: string[],
    currentColumn: Column
  ) => {
    const allPathsOfNode: string[] = [];

    // Loop tru paths to get path string
    paths.forEach((path: any, nodeId: number) => {
      if (currentNode.id === nodeId) {
        path.nodes.forEach((childNodeId: number) => {
          if (
            !isUndefined(path.previousPaths[childNodeId]) &&
            !isEmpty(path.previousPaths[childNodeId])
          ) {
            let stringPath = "" + childNodeId;
            this.loopPreviousPaths(
              path.previousPaths[childNodeId],
              allPathsOfNode,
              stringPath
            );
          } else {
            allPathsOfNode.push("" + childNodeId);
          }
        });

        return true;
      }
    });

    let campPercentage = 0; // Probability of Camp Type
    let isTreasureFoundNear = false; // Flag to check if there is a treasure near the node in the path
    const combatTypes: number[] = [];

    // Loop tru all paths of the node
    allPathsOfNode.forEach((pathString: string) => {
      const pathArray = pathString.split("|");

      // const totalSteps = pathArray.length;
      let steps = 0;
      let countCombat = true;
      // Loop tru all child nodes connected to path
      pathArray.forEach((childNodeIdString: string) => {
        steps++;
        const childNodeId = parseInt(childNodeIdString);
        const childNodeType = allNodesWithTypes[childNodeId];

        if (
          countCombat &&
          (childNodeType === "combat" || childNodeType === "eliteCombat")
        ) {
          if (!combatTypes.includes(childNodeId)) {
            combatTypes.push(childNodeId);
          }
        } else if (childNodeType === "camp") {
          countCombat = false; // Stop counting combats if there is already a camp near
        }

        // Rule for Types (treasure) - Set probability to 0 if treasure is found within 5 connections
        if (steps <= 5 && childNodeType === "treasure") {
          isTreasureFoundNear = true;
        }
      });
    });

    let combatTypesCount = combatTypes.length;
    if (combatTypesCount > 2) {
      // Get all combat types in the path and subtract by 2
      combatTypesCount -= 2;
      // Rule for Types (camp) - Increment camp probability for every combat/eliteCombat after 2 in a path
      campPercentage = combatTypesCount * NodeType.CAMP_VALUE;
    }

    // There's a condition where Path Rules will get overlooked if the Shop Rule (mandatory appearance per 3rd column) is activated
    if (nodeType.getShop() === 1) {
      campPercentage = 0;
    }

    // If the percentage of camp is 100% set the others to 0
    if (campPercentage >= 1) {
      nodeType
        .setCamp(1)
        .setShop(0)
        .setCombat(0)
        .setEliteCombat(0)
        .setEncounter(0)
        .setTreasure(0);
    } else {
      nodeType.setCamp(campPercentage);
    }

    // Rule for Types (treasure) - Set probability to 0 if treasure is found within 5 connections
    if (isTreasureFoundNear) {
      nodeType.setTreasure(0);
    }
  };

  private loopPreviousPaths = (
    path: any,
    allPathsOfNode: string[],
    stringPath: string
  ) => {
    path.nodes.forEach((childNodeId: number) => {
      if (
        !isUndefined(path.previousPaths[childNodeId]) &&
        !isEmpty(path.previousPaths[childNodeId])
      ) {
        let localStringPath = stringPath + "|" + childNodeId;
        this.loopPreviousPaths(
          path.previousPaths[childNodeId],
          allPathsOfNode,
          localStringPath
        );
      } else {
        allPathsOfNode.push(stringPath + "|" + childNodeId);
      }
    });
  };
}

class MapController {
  static generate = (req: Request, res: Response) => {
    try {
      const request = req.query;

      // Map configurations
      const configurations: Configurations = {
        columns: Number(request?.columns ?? 20),
        minNodes: Number(request?.minNodes ?? 2),
        maxNodes: Number(request?.maxNodes ?? 6),
        minConnection: Number(request?.minConnection ?? 1),
        maxConnection: Number(request?.maxConnection ?? 3),
      };

      // Validate parameters
      validateParameters(configurations);

      // Check if max nodes minus min nodes is greater than 1, if it is then nodes per columns should be different from the previous one;
      const shouldNodesDiffer =
        configurations.maxNodes - configurations.minNodes > 1 ? true : false;

      const gameMap = new GameMap(configurations);
      gameMap
        .generateColumns(
          configurations.minNodes,
          configurations.maxNodes,
          shouldNodesDiffer
        )
        .generateConnections(
          configurations.minConnection,
          configurations.maxConnection
        );

      res.status(200).json(gameMap.getData());
    } catch (error: any) {
      res.status(400).json({
        message: error.message,
      });
    }
  };
}

export default MapController;
