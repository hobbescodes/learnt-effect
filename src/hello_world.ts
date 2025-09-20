import { Console, Effect } from "effect";

// define the main app
const main = Console.log("Hello world");

// Execute the app
Effect.runSync(main);

// TIPS:
// An effect is a *description* of a series of operations, alone, it does not execute any logic. You need to explicitly call a run* method
// Main benefit of the above is lazy execution vs eager execution. This provides:
// - Being able to store effects into variables
// - Refactoring without changing the meaning of the program
// - Make them deterministic (easy to test)
