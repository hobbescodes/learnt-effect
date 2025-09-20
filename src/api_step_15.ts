import { Config, Context, Effect, Schema } from "effect";

import { FetchError, JsonError } from "./errors";
import { Pokemon } from "./schemas";

import type { ParseResult } from "effect";
import type { ConfigError } from "effect/ConfigError";

// Verbose, will be refactored in future steps
interface PokeApi {
	readonly getPokemon: Effect.Effect<
		Pokemon,
		FetchError | JsonError | ParseResult.ParseError | ConfigError
	>;
}

// Convenient to give the same name as the interface. This allows to export and use the service both as type and value (overload)
// There are some hidden issues here (will be refactored in next step):
// - Defining, referencing, and would be exporting separate values
// - Risk conflicts between service types when they have same structure (i.e. `PokeApi1` and `PokeApi2`)
const PokeApi = Context.GenericTag<PokeApi>("PokeApi");

const PokeApiLive = PokeApi.of({
	getPokemon: Effect.gen(function* () {
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
	}),
});

// Example of being able to change this for testing:
// const PokeApiTest = PokeApi.of({
//     getPokemon: Effect.succeed({
//         id: 1,
//         height: 10,
//         weight: 10,
//         order: 1,
//         name: "test"
//     })
// })

// Beauty of this is that the logic for said program is still isolated
const program = Effect.gen(function* () {
	const pokeApi = yield* PokeApi;

	return yield* pokeApi.getPokemon;
});

const main = program.pipe(
	// !NB: providing a service allows for composability
	// same as having `const runnable = program.pipe(Effect.provideService(PokeApi, PokeApiLive))` above and then starting `main` with `runnable.pipe(Effect.catchTags(...))`
	Effect.provideService(PokeApi, PokeApiLive),
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
		ParseError: () => Effect.succeed("Parse error"),
	}),
);

Effect.runPromise(main).then(console.log);
