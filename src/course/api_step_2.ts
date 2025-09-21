import { Effect } from "effect";

// Error provided directly in the type
const fetchRequest = Effect.tryPromise(() =>
	fetch("https://pokeapi.co/api/v2/pokemon/charmander/"),
);

const jsonResponse = (response: Response) =>
	Effect.tryPromise(() => response.json());

const main = Effect.flatMap(fetchRequest, jsonResponse);

// NB: currently this will throw when something goes wrong (`UnknownException`)
Effect.runPromise(main).then(console.log);
