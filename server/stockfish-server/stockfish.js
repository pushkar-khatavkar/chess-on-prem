// This code uses a stockfish engine and queues requests 
// for production level code I should have pool of stockfish engines not just one

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

let engine = null;
let busy = false;
let queue = [];

function resolveStockfishCommand() {
  if (process.env.STOCKFISH_PATH && process.env.STOCKFISH_PATH.trim()) {
    return { cmd: process.env.STOCKFISH_PATH.trim(), args: [] };
  }

  const platform = process.platform;

  if (platform === "darwin") {
    const macPath = path.join(
      __dirname,
      "..",
      "bin",
      "stockfish",
      "stockfish-macos-m1-apple-silicon"
    );
    if (fs.existsSync(macPath)) return { cmd: macPath, args: [] };
  }

  if (platform === "linux") {
    const linuxPath = "/usr/games/stockfish";
    if (fs.existsSync(linuxPath)) return { cmd: linuxPath, args: [] };
  }

  // Docker/Linux: Dockerfile installs `stockfish` into PATH.
  // Windows: user can set STOCKFISH_PATH to a local stockfish.exe path.
  return { cmd: "stockfish", args: [] };
}

function getEngine() {
  if (!engine) {
    const { cmd, args } = resolveStockfishCommand();
    engine = spawn(cmd, args);
    engine.stdin.write("uci\n");

    engine.on("exit",() => {
      engine = null;
    });

    engine.on("error", () => {
      engine = null;
    });
  }
  return engine;
}

function getBestMove(fen,depth) {
  return new Promise((resolve,reject) => {
    const task = async () => {
      const sf = getEngine();
      let buffer = "";

      const onData = (data) => {
        buffer += data.toString();
        const lines = buffer.split("\n");

        for (let line of lines) {
          line = line.trim();
          if (line.startsWith("bestmove")) {
            sf.stdout.off("data",onData);
            resolve(line.split(" ")[1]);
            if (queue.length > 0) {
              const next = queue.shift();
              busy = true;
              next();
            }else busy = false;
            return;
          }
        }
      };

      sf.stdout.on("data", onData);
      sf.stdin.write("ucinewgame\n");
      sf.stdin.write(`position fen ${fen}\n`);
      sf.stdin.write(`go depth ${depth}\n`);
    };

    if (busy) {
      queue.push(task);
    } else {
      busy = true;
      task();
    }
  });
}

module.exports = { getBestMove };
