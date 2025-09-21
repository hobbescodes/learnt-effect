import { expect, it } from "bun:test";

import { ConfigProvider, Effect, Layer } from "effect";

import { PokeApi } from "../services";

const TestConfigProvider = ConfigProvider.fromMap(
	new Map([["BASE_URL", "http://localhost:3000/api/v2"]]),
);

const ConfigProviderLayer = Layer.setConfigProvider(TestConfigProvider);

const MainLayer = PokeApi.Default.pipe(Layer.provide(ConfigProviderLayer));

const program = Effect.gen(function* () {
	const pokeApi = yield* PokeApi;

	return yield* pokeApi.getPokemon;
});

const main = program.pipe(Effect.provide(MainLayer));

it("returns a valid pokemon", async () => {
	const response = await Effect.runPromise(main);

	expect(response).toEqual({
		id: 1,
		height: 10,
		weight: 10,
		order: 1,
		name: "myname",
	});
});
