import { Effect } from "effect";

// Divide API request into 2 steps
const fetchRequest = Effect.promise(() =>
	fetch("https://pokeapi.co/api/v2/pokemon/charmander/"),
);

const jsonResponse = (response: Response) =>
	// NB: important to note that `Effect.promise` assumes that the operation can never fail. Instead can use `tryPromise`
	Effect.promise(() => response.json());

// flatMap: access the result of an effect and chain another Effect
const main = Effect.flatMap(
	fetchRequest,
	// NB: the below can just be simplified to `jsonResponse` as the functional param of `response` is implied
	(response) => jsonResponse(response),
);

Effect.runPromise(main).then(console.log);
