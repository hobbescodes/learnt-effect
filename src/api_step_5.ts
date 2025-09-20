import { Effect } from "effect";

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

// When you handle an error, it is removed from the error type parameter
const main = fetchRequest.pipe(
	Effect.flatMap(jsonResponse),
	// Can do a lot more than just return an error message:
	// - Retry requests on a schedule
	// - Try a different request if the first fails
	// - Recover from errors with another valid value
	// etc
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
	}),
);

Effect.runPromise(main).then(console.log);
