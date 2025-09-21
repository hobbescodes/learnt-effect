import { Effect } from "effect";

// Error provided directly in the type
const fetchRequest = Effect.tryPromise(() =>
	fetch("https://pokeapi.co/api/v2/pokemon/charmander/"),
);

const jsonResponse = (response: Response) =>
	Effect.tryPromise(() => response.json());

// `pipe` takes the result of a function and provides it to the next one in the chain
// const main = pipe(fetchRequest, Effect.flatMap(jsonResponse));

// Since the pipe pattern is used everywhere, every Effect comes with its own pipe function. So the above can be improved:
const main = fetchRequest.pipe(Effect.flatMap(jsonResponse));

// Effect dual API. Other versions of the above:
// fetchRequest.pipe((fetchRequestEffect) => Effect.flatMap(fetchRequestEffect, jsonResponse))
// fetchRequest.pipe((fetchRequestEffect) => Effect.flatMap(jsonResponse)(fetchRequestEffect))

Effect.runPromise(main).then(console.log);
