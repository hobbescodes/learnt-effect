import { Data, Effect } from "effect";

// `Data.TaggedError`: string param contains what will be used as `_tag`, type param defines extra info that is required to initialize the error
// biome-ignore lint: who cares
class FetchError extends Data.TaggedError("FetchError")<{}> {}
// biome-ignore lint: who cares
class JsonError extends Data.TaggedError("JsonError")<{}> {}

const fetchRequest = Effect.tryPromise({
	try: () => fetch("https://pokeapi.co/api/v2/pokemon/charmander/"),
	catch: () => new FetchError(),
});

const jsonResponse = (response: Response) =>
	Effect.tryPromise({
		try: () => response.json(),
		catch: () => new JsonError(),
	});

const main = fetchRequest.pipe(
	Effect.filterOrFail(
		(response) => response.ok,
		() => new FetchError(),
	),
	Effect.flatMap(jsonResponse),
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
	}),
);

Effect.runPromise(main).then(console.log);
