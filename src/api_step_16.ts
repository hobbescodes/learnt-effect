import { Config, Context, Effect, Schema } from "effect";

import { FetchError, JsonError } from "./errors";
import { Pokemon } from "./schemas";

import type { ParseResult } from "effect";
import type { ConfigError } from "effect/ConfigError";

interface PokeApiImpl {
	readonly getPokemon: Effect.Effect<
		Pokemon,
		FetchError | JsonError | ParseResult.ParseError | ConfigError
	>;
}

// NB: best practice to use `Context.Tag` instead of `Context.GenericTag`
// reduce service definition to one value, `Context.Tag` makes sure that the service is unique internally, can define methods / attributes that are accessible for any instance
class PokeApi extends Context.Tag("PokeApi")<PokeApi, PokeApiImpl>() {
	static readonly Live = PokeApi.of({
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
}

const program = Effect.gen(function* () {
	const pokeApi = yield* PokeApi;

	return yield* pokeApi.getPokemon;
});

const liveProgram = program.pipe(Effect.provideService(PokeApi, PokeApi.Live));

const main = liveProgram.pipe(
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
		ParseError: () => Effect.succeed("Parse error"),
	}),
);

Effect.runPromise(main).then(console.log);
