import { Config, Effect, Schema } from "effect";

// This step involves reorganization errors and schemas into their own files
import { FetchError, JsonError } from "./errors";
import { Pokemon } from "./schemas";

const getPokemon = Effect.gen(function* () {
	const baseUrl = yield* Config.string("BASE_URL");

	const response = yield* Effect.tryPromise({
		try: () => fetch(`${baseUrl}/pokemon/charmander/`),
		catch: () => new FetchError(),
	});

	if (!response.ok) {
		return yield* new FetchError();
	}

	const json = yield* Effect.tryPromise({
		try: () => response.json(),
		catch: () => new JsonError(),
	});

	return yield* Schema.decodeUnknown(Pokemon)(json);
});

const main = getPokemon.pipe(
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
		ParseError: () => Effect.succeed("Parse error"),
	}),
);

Effect.runPromise(main).then(console.log);
