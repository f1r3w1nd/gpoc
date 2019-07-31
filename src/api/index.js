import faker from 'faker';

const generateGraph = (nodesNum = 7, edgesNum = 26) => {
	faker.seed(Date.now());

	const nodes = [...new Array(nodesNum)].map((e, id) => {
		return {
			id,
			name: faker.name.firstName(),
			surName: faker.name.lastName(),
			cif: faker.finance.account(),
		}
	});
	const edges = [...new Array(edgesNum)].map((e, id) => {
		return {
			source: Math.ceil(faker.random.number() % nodesNum),
			target: Math.ceil(faker.random.number() % nodesNum),
			when: faker.date.recent(),
			amount: faker.finance.amount(),
			transactionType: faker.finance.transactionType(),
			currency: faker.finance.currencyCode(),
		};
	});

	const reverseEdges = edges.map(edge => ({
		source: edge.source,
		target: edge.target,
		when: faker.date.recent(),
		amount: faker.finance.amount(),
		transactionType: faker.finance.transactionType(),
		currency: faker.finance.currencyCode(),
	}));

	return {
		nodes,
		edges: edges.concat(reverseEdges),
	};
};

export default generateGraph();
