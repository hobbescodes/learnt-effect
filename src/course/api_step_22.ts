import { Config, Effect, Layer, ManagedRuntime, Schema } from "effect";

import { FetchError, JsonError } from "../errors";
import { Pokemon } from "../schemas";

// Main goal of this step is to refactor services to provide default implementation with `Effect.Service`
// As a side quest, converged the poke api url services

class PokemonCollection extends Effect.Service<PokemonCollection>()(
	"PokemonCollection",
	{
		// default implementation
		succeed: ["staryu", "perrserker", "flaaffy"],
	},
) {}

class PokeApiUrl extends Effect.Service<PokeApiUrl>()("PokeApiUrl", {
	effect: Effect.gen(function* () {
		const baseUrl = yield* Config.string("BASE_URL");

		return ({ name }: { name: string }) => `${baseUrl}/pokemon/${name}`;
	}),
}) {}

class PokeApi extends Effect.Service<PokeApi>()("PokeApi", {
	effect: Effect.gen(function* () {
		const pokemonCollection = yield* PokemonCollection;
		const buildPokeApiUrl = yield* PokeApiUrl;

		return {
			getPokemon: Effect.gen(function* () {
				const requestUrl = buildPokeApiUrl({ name: pokemonCollection[0] });

				const response = yield* Effect.tryPromise({
					try: () => fetch(requestUrl),
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
		};
	}),
	dependencies: [PokemonCollection.Default, PokeApiUrl.Default],
}) {}

const program = Effect.gen(function* () {
	const pokeApi = yield* PokeApi;

	return yield* pokeApi.getPokemon;
});

const MainLayer = Layer.mergeAll(PokeApi.Default);

const PokemonRuntime = ManagedRuntime.make(MainLayer);

// Not needed anymore with managed runtime
// const liveProgram = program.pipe(Effect.provide(MainLayer));

const main = program.pipe(
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
		ParseError: () => Effect.succeed("Parse error"),
	}),
);

PokemonRuntime.runPromise(main).then(console.log);
