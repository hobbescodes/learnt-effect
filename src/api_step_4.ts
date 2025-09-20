import { Effect } from "effect";

// Only "requirement" for custom errors in effect is having a _tag parameter used as a discriminator
interface FetchError {
	readonly _tag: "FetchError";
}

interface JsonError {
	readonly _tag: "JsonError";
}

const fetchRequest = Effect.tryPromise({
	try: () => fetch("https://pokeapi.co/api/v2/pokemon/charmander/"),
	catch: (): FetchError => ({ _tag: "FetchError" }),
});

const jsonResponse = (response: Response) =>
	Effect.tryPromise({
		try: () => response.json(),
		catch: (): JsonError => ({ _tag: "JsonError" }),
	});

// Errors are automatically acummulated in the error type
const main = fetchRequest.pipe(Effect.flatMap(jsonResponse));

Effect.runPromise(main).then(console.log);
