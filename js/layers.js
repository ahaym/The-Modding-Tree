const dataColors = {
	primitive: "#F8F7F2",
	relational: "#8FD694",
	storage: "#5BC0EB",
	tableFormat: "#FACC15",
	network: "#F97316",
	optimizer: "#FDE74C",
	semantic: "#C084FC",
	visual: "#FF6B6B",
	execution: "#A7F3D0",
}

function layerPoints(layer) {
	if (!player[layer]) return new Decimal(0)
	return player[layer].points
}

function layerBoost(layer, power = 1) {
	return layerPoints(layer).add(10).log(10).pow(power)
}

function sourceAmount(source) {
	if (source == "events") return player.points
	return layerPoints(source)
}

function spendSource(source, cost) {
	if (source == "events") {
		player.points = player.points.sub(cost)
		return
	}
	player[source].points = player[source].points.sub(cost)
}

const targetedDiscounts = []

function targetedCostReduction(targetLayer, targetId) {
	let mult = new Decimal(1)
	for (let index = 0; index < targetedDiscounts.length; index++) {
		let discount = targetedDiscounts[index]
		if (discount.targetLayer != targetLayer || discount.targetId != targetId) continue
		if (!player[discount.sourceLayer]) continue
		mult = mult.times(Decimal.pow(discount.rate, getBuyableAmount(discount.sourceLayer, discount.sourceId)))
	}
	if (mult.lt(0.1)) return new Decimal(0.1)
	return mult
}

function makeAnalyticsLayer(config) {
	const isShopOnly = config.shopOnly || !config.resetLayer
	const passiveRate = config.passiveGeneration === undefined ? (config.resetLayer ? 0.25 : 0.001) : config.passiveGeneration
	const passivePercent = passiveRate * 100
	const milestonePassiveMultiplier = config.milestonePassiveMultiplier === undefined ? 1 : config.milestonePassiveMultiplier
	const milestonePassivePercent = passivePercent * milestonePassiveMultiplier
	const milestoneTarget = new Decimal(config.milestoneAt || 5).times(Decimal.pow(10, config.row + 1))
	const buyableCostScale = config.buyableCost || Decimal.pow(10, config.row + 1)
	const upgradeCostScale = config.upgradeCostScale || Decimal.pow(10, config.row + 1)
	let upgrades = {}
	if (config.upgradeTitle && !config.buyablesOnly) {
		upgrades[11] = {
			title: config.upgradeTitle,
			description: config.upgradeDescription
				+ "<br><br>Effect: multiplies " + config.resource
				+ " gain based on your current " + config.resource + "."
				+ (config.upgradeBoostedBy ? "<br><br>Also scales with: " + config.upgradeBoostedBy.join(", ") + "." : "")
				+ (isShopOnly ? "" : "<br><br>Also unlocks passive gain for this layer: " + passivePercent
				+ "% of reset gain per second."),
			cost: new Decimal(config.upgradeCost || 1).times(upgradeCostScale),
			effect() {
				let effect = player[this.layer].points.add(1).ln().add(1).pow(config.upgradePower || 1)
				if (config.upgradeBoostedBy) {
					for (let index = 0; index < config.upgradeBoostedBy.length; index++) {
						effect = effect.times(layerBoost(config.upgradeBoostedBy[index]))
					}
				}
				return effect
			},
			effectDisplay() {return format(this.effect()) + "x " + config.resource + " gain"},
		}
	}

	let buyables = {}
	if (config.buyableTitle) {
		buyables[11] = {
			title: config.buyableTitle,
			cost(x) {
				let cost = Decimal.pow(config.buyableBase || 2, x.add(1)).times(buyableCostScale)
				cost = cost.times(targetedCostReduction(config.id, 11))
				return cost.max(1).floor()
			},
			effect(x) {
				return x.add(1).pow(config.buyablePower || 1)
			},
			display() {
				return "You have " + getBuyableAmount(this.layer, this.id) + " " + config.buyableResource
					+ "<br><br>Effect: " + format(buyableEffect(this.layer, this.id)) + "x " + (config.buyableEffectText || tmp[this.layer].resource + " gain")
					+ "<br><br>Cost: " + format(tmp[this.layer].buyables[this.id].cost) + " " + (config.buyableCostResource || tmp[this.layer].resource)
			},
			canAfford() {
				let source = config.buyableCurrencyLayer || this.layer
				return sourceAmount(source).gte(tmp[this.layer].buyables[this.id].cost)
			},
			buy() {
				let cost = tmp[this.layer].buyables[this.id].cost
				let source = config.buyableCurrencyLayer || this.layer
				spendSource(source, cost)
				setBuyableAmount(this.layer, this.id, getBuyableAmount(this.layer, this.id).add(1))
				if (isShopOnly) {
					player[this.layer].points = player[this.layer].points.add(1)
					player[this.layer].total = player[this.layer].total.add(1)
					if (player[this.layer].points.gt(player[this.layer].best)) player[this.layer].best = player[this.layer].points
				}
			},
		}
	}

	let tabFormat = isShopOnly ? [
		"resource-display",
		["blank", "12px"],
		["display-text", config.definition],
		["blank", "12px"],
		["display-text", config.flavor],
		["blank", "12px"],
		"buyables",
		["blank", "12px"],
		"upgrades",
		["blank", "12px"],
		"milestones",
	] : [
		"main-display",
		["display-text", config.effectDescription + "."],
		["display-text", "Passive: buy this layer's upgrade to gain " + passivePercent + "% of reset gain each second while the reset requirement is met."],
		["blank", "8px"],
		"prestige-button",
		"resource-display",
		["blank", "12px"],
		["display-text", config.definition],
		["blank", "12px"],
		["display-text", config.flavor],
		["blank", "12px"],
		"buyables",
		["blank", "12px"],
		"upgrades",
		["blank", "12px"],
		"milestones",
	]
	if (isShopOnly && config.buyablesOnly) tabFormat = [
		"resource-display",
		["blank", "12px"],
		["display-text", config.definition],
		["blank", "12px"],
		["display-text", config.flavor],
		["blank", "12px"],
		"buyables",
		["blank", "12px"],
		"milestones",
	]

	addLayer(config.id, {
		name: config.name,
		symbol: config.symbol,
		position: config.position,
		startData() { return {
			unlocked: true,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
		}},
		color: config.color,
		requires: config.requires,
		resource: config.resource,
		baseResource: config.baseResource,
		baseAmount: config.baseAmount,
		type: isShopOnly ? "none" : (config.type || "normal"),
		exponent: config.exponent || 0.5,
		gainMult() {
			let mult = new Decimal(1)
			if (config.boostedBy) {
				for (let index = 0; index < config.boostedBy.length; index++) {
					mult = mult.times(layerBoost(config.boostedBy[index]))
				}
			}
			if (config.buyableTitle) mult = mult.times(buyableEffect(this.layer, 11))
			if (config.upgradeTitle && hasUpgrade(this.layer, 11)) mult = mult.times(upgradeEffect(this.layer, 11))
			return mult
		},
		gainExp() {
			return new Decimal(1)
		},
		effect() {
			if (isShopOnly && config.buyableTitle) return buyableEffect(this.layer, 11)
			let effect = player[this.layer].points.add(1).ln().add(1).pow(config.effectPower || 1)
			if (config.buyableTitle) effect = effect.times(buyableEffect(this.layer, 11))
			return effect
		},
		effectDescription() {
			return config.effectDescription + " by " + format(tmp[this.layer].effect) + "x"
		},
		passiveGeneration() {
			if (isShopOnly) return new Decimal(0)
			if (!tmp[config.id].baseAmount || tmp[config.id].baseAmount.lt(tmp[config.id].requires)) return new Decimal(0)
			if (hasMilestone(config.id, 0) && !config.disableMilestonePassive) return new Decimal(passiveRate).times(milestonePassiveMultiplier)
			if (!hasUpgrade(config.id, 11)) return new Decimal(0)
			return new Decimal(passiveRate)
		},
		row: config.row,
		branches: config.branches,
		layerShown() {
			if (config.id == "row") return true
			if (config.unlockUpgrade) {
				return hasUpgrade("row", config.unlockUpgrade) || player[this.layer].best.gt(0) || player[this.layer].total.gt(0)
			}
			return config.baseAmount().gt(0) || player[this.layer].best.gt(0) || player[this.layer].total.gt(0)
		},
		tooltip() {
			return formatWhole(player[this.layer].points) + " " + this.resource
		},
		tabFormat,
		upgrades,
		buyables,
		milestones: {
			0: {
				requirementDescription() {return formatWhole(milestoneTarget) + " " + config.resource},
				effectDescription() {
					if (config.milestoneEffectText) return config.milestoneEffectText
					if (isShopOnly && config.autobuyOnMilestone) return config.milestoneText + " Autobuys " + config.buyableResource + "."
					if (isShopOnly) return config.milestoneText
					return config.milestoneText + " Passive gain continues at " + milestonePassivePercent + "% of reset gain per second."
				},
				done() {return player[this.layer].best.gte(milestoneTarget)},
			},
		},
		automate() {
			if (config.autobuyOnMilestone && hasMilestone(this.layer, 0)) buyBuyable(this.layer, 11)
		},
		hotkeys: (config.hotkey && !isShopOnly) ? [
			{
				key: config.hotkey,
				description: config.hotkey.toUpperCase() + ": reset for " + config.resource,
				onPress(){if (canReset(this.layer)) doReset(this.layer)},
			},
		] : [],
	})
}

makeAnalyticsLayer({
	id: "row",
	name: "Row",
	symbol: "Row",
	position: 0,
	row: 0,
	color: dataColors.primitive,
	requires: new Decimal(10),
	resource: "rows",
	baseResource: "events",
	baseAmount() {return player.points},
	resetLayer: true,
	boostedBy: ["rel", "alg"],
	definition: "A row is one event shaped into tabular form: values aligned to attributes and ready for analytics systems.",
	flavor: "Raw events become rows once ingestion assigns timestamps, identifiers, source names, and failure modes.",
	effectDescription: "Rows multiply event ingress",
	upgradeTitle: "Online Ingestion",
	upgradeDescription: "Continuously ingest event streams into rows instead of relying on manual batch resets.",
	upgradeCost: new Decimal(20),
	buyableTitle: "Typed Tuple",
	buyableResource: "typed tuples",
	buyableCost: new Decimal(0.5),
	buyableBase: 2,
	buyablePower: 0.75,
	passiveGeneration: 0.25,
	milestoneAt: 5,
	milestoneText: "Event producers become explicit.",
	milestoneEffectText: "Unlocks Event Sources and keeps Online Ingestion running at 25% of reset gain per second.",
	hotkey: "t",
})

layers.row.upgrades[12] = {
	title: "Source Registry",
	description: "Register upstream producers so rows create event ingress instead of only consuming it.",
	cost: new Decimal(250),
	effect() {
		return buyableEffect("row", 12).add(1).ln().add(1)
	},
	effectDisplay() {return format(this.effect()) + "x event gain"},
	unlocked() {return hasUpgrade("row", 11) && hasMilestone("row", 0)},
}

const initialRowUnlocks = [13, 14, 15, 16, 17, 18]

function initialRowUnlockCount() {
	let count = 0
	for (let index = 0; index < initialRowUnlocks.length; index++) {
		if (hasUpgrade("row", initialRowUnlocks[index])) count++
	}
	return count
}

function initialRowUnlockCost(id) {
	let count = initialRowUnlockCount()
	if (hasUpgrade("row", id)) count--
	return Decimal.pow(1.75, count).times(25).floor()
}

function rowUnlockUpgrade(id, title, layerName) {
	layers.row.upgrades[id] = {
		fullDisplay() {
			return title + "<br><br>Unlocks " + layerName + ".<br><br>Each initial branch costs more than the last.<br><br>Cost: " + format(initialRowUnlockCost(id)) + " rows"
		},
		canAfford() {
			return player.row.points.gte(initialRowUnlockCost(id))
		},
		pay() {
			player.row.points = player.row.points.sub(initialRowUnlockCost(id))
		},
		unlocked() {
			return true
		},
	}
}

rowUnlockUpgrade(13, "Codd Surface", "Relations")
rowUnlockUpgrade(14, "Algebra Workbench", "Relational Algebra")
rowUnlockUpgrade(15, "Columnar Files", "Table Formats")
rowUnlockUpgrade(16, "Visual Encoding", "Visualization Grammars")
rowUnlockUpgrade(17, "Transport Socket", "Network Links")
rowUnlockUpgrade(18, "Vector Register", "SIMD Instructions")

layers.row.buyables[12] = {
	title: "Event Source",
	cost(x) {
		return Decimal.pow(3, x.add(1)).times(15).times(targetedCostReduction("row", 12)).max(1).floor()
	},
	effect(x) {
		return x.mul(0.25)
	},
	display() {
		return "You have " + formatWhole(getBuyableAmount(this.layer, this.id)) + " event sources"
			+ "<br><br>Effect: +" + format(buyableEffect(this.layer, this.id)) + " base events/sec"
			+ "<br><br>Cost: " + format(tmp[this.layer].buyables[this.id].cost) + " rows"
	},
	canAfford() {
		return player.row.points.gte(tmp[this.layer].buyables[this.id].cost)
	},
	buy() {
		let cost = tmp[this.layer].buyables[this.id].cost
		player.row.points = player.row.points.sub(cost)
		setBuyableAmount(this.layer, this.id, getBuyableAmount(this.layer, this.id).add(1))
	},
	unlocked() {return hasMilestone("row", 0)},
}

makeAnalyticsLayer({
	id: "rel",
	name: "Relation",
	symbol: "Rel",
	position: 0,
	row: 1,
	color: dataColors.relational,
	requires: new Decimal(4),
	resource: "relations",
	baseResource: "rows",
	baseAmount() {return layerPoints("row")},
	resetLayer: true,
	unlockUpgrade: 13,
	boostedBy: ["sch", "stat"],
	branches: ["row"],
	definition: "A relation is a set of tuples over named attributes, the formal core behind tables and query results.",
	flavor: "Codd removes physical row order and leaves keys, dependencies, joins, projection, and a lot of useful discipline.",
	effectDescription: "Relations multiply tuple normalization",
	upgradeTitle: "First Normal Form",
	upgradeDescription: "Ban nested attributes until the BI tool invents JSON columns again.",
	upgradeCost: new Decimal(2),
	buyableTitle: "Candidate Keys",
	buyableResource: "candidate keys",
	buyableBase: 2.25,
	buyablePower: 0.8,
	milestoneAt: 8,
	milestoneText: "Projection and selection become first-class operations instead of spreadsheet habits.",
	hotkey: "r",
})

makeAnalyticsLayer({
	id: "sch",
	name: "Schema",
	symbol: "Sch",
	position: 0,
	row: 2,
	color: dataColors.storage,
	requires: new Decimal(3),
	resource: "schemas",
	baseResource: "relations",
	baseAmount() {return layerPoints("rel")},
	buyableCurrencyLayer: "rel",
	buyableCostResource: "relations",
	boostedBy: ["cat", "onto"],
	branches: ["rel"],
	definition: "A schema names relations, columns, data types, constraints, indexes, and ownership boundaries.",
	flavor: "DDL is where product assumptions become production contracts.",
	effectDescription: "Schemas multiply relation materialization",
	upgradeTitle: "Foreign Key Constraints",
	upgradeDescription: "Make relationships explicit enough for integrity checks, joins, and modeling tools to trust them.",
	upgradeBoostedBy: ["rel"],
	upgradeCost: new Decimal(2),
	buyableTitle: "Check Constraints",
	buyableResource: "check constraints",
	buyableBase: 2,
	buyablePower: 1.1,
	milestoneAt: 6,
	milestoneText: "Dimension tables become reusable instead of being rebuilt in every dashboard.",
	hotkey: "s",
})

makeAnalyticsLayer({
	id: "cat",
	name: "Catalog",
	symbol: "Catlg",
	position: 0,
	row: 3,
	color: dataColors.storage,
	requires: new Decimal(2),
	resource: "catalogs",
	baseResource: "schemas",
	baseAmount() {return layerPoints("sch")},
	buyableCurrencyLayer: "sch",
	buyableCostResource: "schemas",
	boostedBy: ["db", "met", "sem"],
	branches: ["sch", "stat", "met", "sem"],
	definition: "A catalog stores metadata about schemas, tables, columns, indexes, statistics, privileges, and lineage.",
	flavor: "Catalog data is operational: query planners, governance tools, and BI explorers all depend on it.",
	effectDescription: "Catalogs multiply schema discovery",
	upgradeTitle: "Information Schema",
	upgradeDescription: "Expose standard metadata views so tools can discover tables without hand-maintained config.",
	upgradeBoostedBy: ["sch", "stat"],
	upgradeCost: new Decimal(1),
	buyableTitle: "Statistics Objects",
	buyableResource: "statistics objects",
	buyableBase: 2.5,
	buyablePower: 1,
	milestoneAt: 4,
	milestoneText: "The data dictionary becomes complete enough for humans and planners to use.",
	hotkey: "c",
})

makeAnalyticsLayer({
	id: "db",
	name: "Database",
	symbol: "DB",
	position: 0,
	row: 4,
	color: dataColors.storage,
	requires: new Decimal(2),
	resource: "databases",
	baseResource: "catalogs",
	baseAmount() {return layerPoints("cat")},
	resetLayer: true,
	boostedBy: ["fmt", "exec", "dist", "onto"],
	branches: ["cat", "fmt", "exec", "dist", "onto"],
	definition: "A database combines logical models with storage, transactions, indexes, catalogs, and execution engines.",
	flavor: "Relations are clean; databases add pages, locks, WAL, compaction, memory pressure, and operational reality.",
	effectDescription: "Databases multiply the whole storage spine",
	upgradeTitle: "MVCC Snapshots",
	upgradeDescription: "Serve consistent reads while writes continue, with vacuum debt waiting in the background.",
	upgradeBoostedBy: ["cat", "fmt"],
	upgradeCost: new Decimal(1),
	buyableTitle: "Buffer Pages",
	buyableResource: "buffer pages",
	buyableBase: 3,
	buyablePower: 1.2,
	autobuyOnMilestone: true,
	milestoneAt: 3,
	milestoneText: "Operational constraints now matter as much as logical correctness.",
	hotkey: "d",
})

makeAnalyticsLayer({
	id: "fmt",
	name: "Table Format",
	symbol: "Fmt",
	position: 1,
	row: 1,
	color: dataColors.tableFormat,
	requires: new Decimal(2),
	resource: "table formats",
	baseResource: "rows",
	baseAmount() {return layerPoints("row")},
	shopOnly: true,
	buyablesOnly: true,
	unlockUpgrade: 15,
	buyableCurrencyLayer: "row",
	buyableCostResource: "rows",
	boostedBy: ["stat", "flight", "db", "exec"],
	branches: ["row", "stat", "flight", "db", "exec"],
	definition: "A table format defines how rows are stored for analytics: files, row groups, column chunks, statistics, schema evolution, and snapshots.",
	flavor: "Parquet and ORC make scans cheap with column chunks and compression; Iceberg and Delta add manifests, snapshots, partitions, and commit protocols.",
	effectDescription: "Table formats multiply storage interoperability",
	upgradeTitle: "Predicate Pushdown",
	upgradeDescription: "Use row-group and column statistics to skip files, stripes, and pages before the executor reads bytes.",
	upgradeCost: new Decimal(1),
	buyableTitle: "Table Format",
	buyableResource: "table formats",
	buyableEffectText: "storage interoperability and file skipping",
	buyableBase: 2.5,
	buyablePower: 1.2,
	autobuyOnMilestone: true,
	milestoneAt: 3,
	milestoneText: "Compression codecs and min/max stats become part of query planning.",
	hotkey: "g",
})

makeAnalyticsLayer({
	id: "alg",
	name: "Relational Algebra",
	symbol: "RA",
	position: -2,
	row: 1,
	color: dataColors.relational,
	requires: new Decimal(4),
	resource: "algebra terms",
	baseResource: "rows",
	baseAmount() {return layerPoints("row")},
	unlockUpgrade: 14,
	buyableCurrencyLayer: "row",
	buyableCostResource: "rows",
	boostedBy: ["qry", "opt"],
	branches: ["row"],
	definition: "Relational algebra composes selection, projection, joins, union, difference, aggregation, and renaming.",
	flavor: "SQL gets lowered into algebra so equivalence rules can simplify and reorder work.",
	effectDescription: "Algebra terms multiply tuple rewriting",
	upgradeTitle: "Rename Operator",
	upgradeDescription: "Track attribute names through derived relations so later joins do not become ambiguous.",
	upgradeCost: new Decimal(2),
	buyableTitle: "Join Trees",
	buyableResource: "join trees",
	buyableCost: new Decimal(10),
	buyableBase: 2.2,
	buyablePower: 0.9,
	milestoneAt: 8,
	milestoneText: "Selection pushdown removes rows before the expensive operators see them.",
	hotkey: "a",
})

makeAnalyticsLayer({
	id: "qry",
	name: "Query",
	symbol: "SQL",
	position: -2,
	row: 2,
	color: dataColors.relational,
	requires: new Decimal(3),
	resource: "queries",
	baseResource: "algebra terms",
	baseAmount() {return layerPoints("alg")},
	buyableCurrencyLayer: "alg",
	buyableCostResource: "algebra terms",
	boostedBy: ["exec", "opt", "ds"],
	branches: ["alg"],
	definition: "A query describes the result relation while leaving access paths, join order, and physical operators open.",
	flavor: "The SELECT list reads like intent; the FROM clause determines whether the system has a long afternoon.",
	effectDescription: "Queries multiply algebra lowering",
	upgradeTitle: "Correlated Subquery",
	upgradeDescription: "Reference outer rows from inner expressions and give the optimizer a decorrelation problem.",
	upgradeCost: new Decimal(2),
	buyableTitle: "Common Table Expressions",
	buyableResource: "CTEs",
	buyableBase: 2,
	buyablePower: 1,
	milestoneAt: 6,
	milestoneText: "Recursive CTEs become a sanctioned fixed point.",
	hotkey: "q",
})

makeAnalyticsLayer({
	id: "stat",
	name: "Table Statistics",
	symbol: "Stats",
	position: -1,
	row: 1,
	color: dataColors.optimizer,
	requires: new Decimal(4),
	resource: "histograms",
	baseResource: "table formats",
	baseAmount() {return layerPoints("fmt")},
	shopOnly: true,
	buyableCurrencyLayer: "fmt",
	buyableCostResource: "table formats",
	boostedBy: ["cat", "opt"],
	branches: ["fmt"],
	definition: "Table statistics summarize formatted storage: row-group counts, column distributions, null fractions, min/max ranges, and data skew.",
	flavor: "Histograms, most-common values, and distinct-count estimates are small summaries extracted from table files with large consequences.",
	effectDescription: "Histograms multiply tuple sampling",
	upgradeTitle: "NDV Estimator",
	upgradeDescription: "Count distinct values by not counting most of them.",
	upgradeCost: new Decimal(2),
	buyableTitle: "Most Common Values",
	buyableResource: "MCV buckets",
	buyableEffectText: "cardinality estimates",
	buyableBase: 2,
	buyablePower: 1.15,
	autobuyOnMilestone: true,
	milestoneAt: 8,
	milestoneText: "The planner stops assuming uniform distributions for obviously skewed columns.",
	hotkey: "h",
})

makeAnalyticsLayer({
	id: "opt",
	name: "Query Optimizer",
	symbol: "Opt",
	position: 2,
	row: 4,
	color: dataColors.optimizer,
	requires: new Decimal(2),
	resource: "plans",
	baseResource: "executors",
	baseAmount() {return layerPoints("exec")},
	buyableCurrencyLayer: "exec",
	buyableCostResource: "executors",
	boostedBy: ["stat", "db", "fmt", "dist"],
	branches: ["exec", "stat", "db", "fmt", "dist"],
	definition: "A query optimizer searches equivalent logical plans and chooses physical operators using estimated cost.",
	flavor: "Executor feedback, dynamic programming, cardinality estimates, access paths, bushy joins, and one catastrophic nested loop.",
	effectDescription: "Plans multiply query execution",
	upgradeTitle: "Volcano Memo",
	upgradeDescription: "Memoize equivalent expressions so cost-based search can compare alternatives directly.",
	upgradeBoostedBy: ["stat", "exec"],
	upgradeCost: new Decimal(1),
	buyableTitle: "Join Reorderings",
	buyableResource: "join reorderings",
	buyableBase: 2.75,
	buyablePower: 1.05,
	milestoneAt: 4,
	milestoneText: "The optimizer learns to fear cross joins.",
	hotkey: "o",
})

makeAnalyticsLayer({
	id: "ds",
	name: "Data Set",
	symbol: "DS",
	position: -1,
	row: 3,
	color: dataColors.semantic,
	requires: new Decimal(2),
	resource: "data sets",
	baseResource: "queries",
	baseAmount() {return layerPoints("qry")},
	buyableCurrencyLayer: "qry",
	buyableCostResource: "queries",
	boostedBy: ["met", "viz"],
	branches: ["qry"],
	definition: "A data set is a governed query result with lineage, freshness, owners, documentation, and consumers.",
	flavor: "It is not just a table; it is a reusable contract for downstream analytics.",
	effectDescription: "Data sets multiply query reuse",
	upgradeTitle: "Column Lineage",
	upgradeDescription: "Trace output fields back through transforms so ownership and impact analysis are possible.",
	upgradeCost: new Decimal(1),
	buyableTitle: "Materializations",
	buyableResource: "materializations",
	buyableBase: 2.25,
	buyablePower: 1.1,
	milestoneAt: 4,
	milestoneText: "Freshness SLAs become visible enough to be enforced.",
	hotkey: "x",
})

makeAnalyticsLayer({
	id: "met",
	name: "Metric",
	symbol: "Met",
	position: -1,
	row: 4,
	color: dataColors.semantic,
	requires: new Decimal(2),
	resource: "metrics",
	baseResource: "data sets",
	baseAmount() {return layerPoints("ds")},
	buyableCurrencyLayer: "ds",
	buyableCostResource: "data sets",
	boostedBy: ["cat", "onto", "sem"],
	branches: ["ds", "cat"],
	definition: "A metric defines a measure, grain, filters, valid dimensions, owner, freshness target, and business meaning.",
	flavor: "Revenue, conversion, churn, retention, active users: each is a query plus a contract about how it may be grouped.",
	effectDescription: "Metrics multiply semantic compilation",
	upgradeTitle: "Metric Contract",
	upgradeDescription: "Define grain, filters, owners, allowed dimensions, and freshness expectations for each measure.",
	upgradeBoostedBy: ["ds"],
	upgradeCost: new Decimal(1),
	buyableTitle: "KPI Definitions",
	buyableResource: "KPI definitions",
	buyableBase: 2.5,
	buyablePower: 1.25,
	milestoneAt: 3,
	milestoneText: "The model starts rejecting contradictory KPI definitions.",
	hotkey: "m",
})

makeAnalyticsLayer({
	id: "sem",
	name: "Semantic Layer",
	symbol: "Sem",
	position: -1,
	row: 5,
	color: dataColors.semantic,
	requires: new Decimal(2),
	resource: "semantic layers",
	baseResource: "metrics",
	baseAmount() {return layerPoints("met")},
	buyableCurrencyLayer: "met",
	buyableCostResource: "metrics",
	boostedBy: ["cat", "dash", "onto"],
	branches: ["met", "cat"],
	definition: "A semantic layer exposes governed metrics, dimensions, permissions, and SQL generation across tools.",
	flavor: "It turns agreed metric contracts into reusable queries for dashboards, notebooks, APIs, and downstream ontology mappings.",
	effectDescription: "Semantic layers multiply dashboard correctness",
	upgradeTitle: "Semantic Compilation",
	upgradeDescription: "Compile metrics, dimensions, access policies, and SQL dialect rules into queryable models.",
	upgradeBoostedBy: ["met", "cat"],
	upgradeCost: new Decimal(1),
	buyableTitle: "Business Terms",
	buyableResource: "business terms",
	buyableBase: 2,
	buyablePower: 1.35,
	milestoneAt: 3,
	milestoneText: "Self-service analytics briefly means what it says.",
	hotkey: "l",
})

makeAnalyticsLayer({
	id: "onto",
	name: "Enterprise Ontology",
	symbol: "OWL",
	position: -1,
	row: 7,
	color: dataColors.semantic,
	requires: new Decimal(2),
	resource: "ontologies",
	baseResource: "semantic layers",
	baseAmount() {return layerPoints("sem")},
	buyableCurrencyLayer: "sem",
	buyableCostResource: "semantic layers",
	boostedBy: ["db", "dist", "dash"],
	branches: ["sem", "sch", "db", "dist"],
	definition: "An enterprise ontology specifies exchange semantics for systems, links, information specs, functions, organizations, facilities, and architecture metadata.",
	flavor: "RDF triples carry identifiers; OWL axioms constrain meaning; temporal parts track change without pretending a renamed system is a new thing.",
	effectDescription: "Ontologies multiply semantic interoperability",
	upgradeTitle: "4D Extensional Identity",
	upgradeDescription: "Identify entities by their physical and temporal extent, so names, versions, ownership, and classifications can change without losing identity.",
	upgradeCost: new Decimal(1),
	buyableTitle: "RDF/OWL Axioms",
	buyableResource: "RDF/OWL axioms",
	buyableBase: 2.5,
	buyablePower: 1.3,
	milestoneAt: 3,
	milestoneText: "Architecture metadata, information specifications, systems, and activities share exchange semantics.",
	hotkey: "n",
})

makeAnalyticsLayer({
	id: "viz",
	name: "Visualization Grammar",
	symbol: "Viz",
	position: 1,
	row: 1,
	color: dataColors.visual,
	requires: new Decimal(4),
	resource: "marks",
	baseResource: "rows",
	baseAmount() {return layerPoints("row")},
	shopOnly: true,
	buyablesOnly: true,
	unlockUpgrade: 16,
	buyableCurrencyLayer: "row",
	buyableCostResource: "rows",
	boostedBy: ["panel", "dash"],
	branches: ["row"],
	definition: "A visualization grammar maps fields to marks, channels, scales, guides, facets, transforms, and layouts.",
	flavor: "Vega-Lite, ggplot, and similar grammars make chart construction explicit enough to reason about.",
	effectDescription: "Marks multiply visual encoding",
	upgradeTitle: "Grammar of Graphics",
	upgradeDescription: "Separate data, encodings, marks, statistical transforms, scales, coordinates, and guides.",
	upgradeCost: new Decimal(2),
	buyableTitle: "Visual Mark",
	buyableResource: "marks",
	buyableEffectText: "visual encoding and panel composition",
	buyableCost: new Decimal(10),
	buyableBase: 2,
	buyablePower: 0.95,
	autobuyOnMilestone: true,
	milestoneAt: 8,
	milestoneText: "Axes stop lying unless explicitly configured to lie.",
	hotkey: "v",
})

makeAnalyticsLayer({
	id: "panel",
	name: "Panel",
	symbol: "Panel",
	position: 1,
	row: 3,
	color: dataColors.visual,
	requires: new Decimal(2),
	resource: "panels",
	baseResource: "marks",
	baseAmount() {return layerPoints("viz")},
	buyableCurrencyLayer: "viz",
	buyableCostResource: "marks",
	boostedBy: ["dash"],
	branches: ["viz", "ds"],
	definition: "A panel combines one visual, its query, thresholds, filters, title, layout, and interaction state.",
	flavor: "Panel design is where chart grammar meets dashboard review, alert thresholds, and limited screen space.",
	effectDescription: "Panels multiply mark composition",
	upgradeTitle: "Small Multiples",
	upgradeDescription: "Repeat the same visual across dimension values for comparison without changing encodings.",
	upgradeCost: new Decimal(1),
	buyableTitle: "Encodings",
	buyableResource: "encodings",
	buyableBase: 2.4,
	buyablePower: 1.15,
	milestoneAt: 4,
	milestoneText: "Tooltips acquire a type system.",
	hotkey: "p",
})

makeAnalyticsLayer({
	id: "dash",
	name: "Dashboard",
	symbol: "Dash",
	position: 1,
	row: 6,
	color: dataColors.visual,
	requires: new Decimal(2),
	resource: "dashboards",
	baseResource: "panels",
	baseAmount() {return layerPoints("panel")},
	buyableCurrencyLayer: "panel",
	buyableCostResource: "panels",
	boostedBy: ["sem", "dist"],
	branches: ["panel", "sem", "dist"],
	definition: "A dashboard assembles panels, filters, parameters, drill paths, access control, and refresh schedules.",
	flavor: "The surface is visual, but the product is a workflow for monitoring, diagnosis, and decision making.",
	effectDescription: "Dashboards multiply the finished analytics surface",
	upgradeTitle: "Crossfilter Interactions",
	upgradeDescription: "Use selections in one panel to filter related panels through shared dimensions.",
	upgradeBoostedBy: ["panel", "sem"],
	upgradeCost: new Decimal(1),
	buyableTitle: "Drill Paths",
	buyableResource: "drill paths",
	buyableBase: 2.5,
	buyablePower: 1.2,
	milestoneAt: 3,
	milestoneText: "The executive view finally respects the metric definitions.",
	hotkey: "b",
})

makeAnalyticsLayer({
	id: "simd",
	name: "SIMD Instruction",
	symbol: "SIMD",
	position: 2,
	row: 1,
	color: dataColors.execution,
	requires: new Decimal(4),
	resource: "SIMD instructions",
	baseResource: "rows",
	baseAmount() {return layerPoints("row")},
	shopOnly: true,
	buyablesOnly: true,
	unlockUpgrade: 18,
	buyableCurrencyLayer: "row",
	buyableCostResource: "rows",
	boostedBy: ["vec", "exec"],
	branches: ["row"],
	definition: "A SIMD instruction applies one operation across multiple data lanes in a CPU vector register.",
	flavor: "AVX, masks, gathers, shuffles, predicate vectors, and the cost of misaligned memory.",
	effectDescription: "SIMD instructions multiply tuple scanning",
	upgradeTitle: "Predicate Masks",
	upgradeDescription: "Represent filter results as lane masks so scans can avoid scalar branches.",
	upgradeCost: new Decimal(2),
	buyableTitle: "SIMD Instruction",
	buyableResource: "SIMD instructions",
	buyableEffectText: "vector packing and executor throughput",
	buyableBase: 2,
	buyablePower: 1.2,
	autobuyOnMilestone: true,
	milestoneAt: 8,
	milestoneText: "The CPU stops pretending scalar code was fine.",
	hotkey: "i",
})

makeAnalyticsLayer({
	id: "vec",
	name: "Column Vector",
	symbol: "Vec",
	position: 2,
	row: 2,
	color: dataColors.execution,
	requires: new Decimal(3),
	resource: "column vectors",
	baseResource: "SIMD instructions",
	baseAmount() {return layerPoints("simd")},
	buyableCurrencyLayer: "simd",
	buyableCostResource: "SIMD instructions",
	boostedBy: ["exec"],
	branches: ["simd"],
	definition: "A column vector stores one field for many rows, usually with validity bitmaps and compact encodings.",
	flavor: "Columnar batches favor scans, compression, predicate pushdown, and vectorized execution.",
	effectDescription: "Column vectors multiply SIMD packing",
	upgradeTitle: "Arrow Buffers",
	upgradeDescription: "Separate values, offsets, and validity so columnar data can move across systems efficiently.",
	upgradeCost: new Decimal(2),
	buyableTitle: "Cache Lines",
	buyableResource: "cache lines",
	buyableCost: new Decimal(1),
	buyableBase: 2.25,
	buyablePower: 1.1,
	milestoneAt: 6,
	milestoneText: "The memory hierarchy accepts your offering.",
	hotkey: "e",
})

makeAnalyticsLayer({
	id: "exec",
	name: "Vectorized Executor",
	symbol: "Exec",
	position: -2,
	row: 3,
	color: dataColors.execution,
	requires: new Decimal(2),
	resource: "executors",
	baseResource: "queries and column vectors",
	baseAmount() {return layerPoints("qry").min(layerPoints("vec"))},
	buyableCurrencyLayer: "qry",
	buyableCostResource: "queries",
	boostedBy: ["opt", "db", "fmt", "dist"],
	branches: ["qry", "vec", "opt", "db", "fmt", "dist"],
	definition: "A vectorized executor evaluates queries in column batches instead of tuple-at-a-time loops.",
	flavor: "Tight loops, selection vectors, late materialization, fused kernels, and runtime feedback for the optimizer.",
	effectDescription: "Executors multiply physical execution",
	upgradeTitle: "Late Materialization",
	upgradeDescription: "Do not fetch the expensive bytes until the predicate has earned them.",
	upgradeBoostedBy: ["qry", "vec"],
	upgradeCost: new Decimal(1),
	buyableTitle: "Operator Kernels",
	buyableResource: "operator kernels",
	buyableBase: 2.75,
	buyablePower: 1.3,
	autobuyOnMilestone: true,
	milestoneAt: 3,
	milestoneText: "The plan is no longer interpreted; it is performed.",
	hotkey: "z",
})

makeAnalyticsLayer({
	id: "net",
	name: "Network Link",
	symbol: "Net",
	position: 2,
	row: 1,
	color: dataColors.network,
	requires: new Decimal(2),
	resource: "network links",
	baseResource: "rows",
	baseAmount() {return layerPoints("row")},
	shopOnly: true,
	buyablesOnly: true,
	unlockUpgrade: 17,
	buyableCurrencyLayer: "row",
	buyableCostResource: "rows",
	boostedBy: ["flight", "dist"],
	branches: ["row", "flight", "dist"],
	definition: "A network link is the primitive transport path for data: endpoints, packets, latency, bandwidth, loss, and routing.",
	flavor: "Before clusters coordinate, bytes cross links with timeouts, retries, congestion, backpressure, and inconvenient packet loss.",
	effectDescription: "Network links multiply data movement",
	upgradeTitle: "Flow Control",
	upgradeDescription: "Apply windows, acknowledgements, retries, and backpressure so fast senders do not overwhelm receivers.",
	upgradeCost: new Decimal(1),
	buyableTitle: "Network Link",
	buyableResource: "network links",
	buyableEffectText: "data movement",
	buyableBase: 2.75,
	buyablePower: 1.2,
	autobuyOnMilestone: true,
	milestoneAt: 3,
	milestoneText: "Timeouts become configuration, not folklore.",
	hotkey: "w",
})

makeAnalyticsLayer({
	id: "flight",
	name: "Flight Protocol",
	symbol: "Flight",
	position: 2,
	row: 2,
	color: dataColors.network,
	requires: new Decimal(2),
	resource: "Flight protocols",
	baseResource: "table formats and network links",
	baseAmount() {return layerPoints("fmt").min(layerPoints("net"))},
	buyableCurrencyLayer: "net",
	buyableCostResource: "network links",
	boostedBy: ["dist"],
	branches: ["fmt", "net", "dist"],
	definition: "A Flight-style protocol combines columnar table formats with network transport for high-throughput data exchange.",
	flavor: "Schema, record batches, endpoints, tickets, streams, and backpressure turn stored columns into network-native analytics payloads.",
	effectDescription: "Flight protocols multiply table transport",
	upgradeTitle: "Columnar RPC",
	upgradeDescription: "Move typed record batches over long-lived streams instead of serializing rows one request at a time.",
	upgradeCost: new Decimal(1),
	buyableTitle: "Record Batch Stream",
	buyableResource: "record batch streams",
	buyableBase: 2.75,
	buyablePower: 1.25,
	milestoneAt: 3,
	milestoneText: "Table format and transport agree on schema, batches, and flow control.",
	hotkey: "y",
})

makeAnalyticsLayer({
	id: "dist",
	name: "Distributed System",
	symbol: "CAP",
	position: 2,
	row: 6,
	color: dataColors.execution,
	requires: new Decimal(2),
	resource: "distributed systems",
	baseResource: "Flight protocols and executors",
	baseAmount() {return layerPoints("flight").min(layerPoints("exec"))},
	resetLayer: true,
	boostedBy: ["dash", "onto"],
	branches: ["flight", "exec", "dash", "onto"],
	definition: "A distributed system coordinates Flight-style data exchange and distributed compute across membership, scheduling, replication, failure detection, and recovery.",
	flavor: "CAP theorem frames the hard choice during partitions; MapReduce jobs run inside the cluster as distributed batch execution.",
	effectDescription: "Distributed systems multiply cluster-scale analytics",
	upgradeTitle: "Consensus Log",
	upgradeDescription: "Use replicated logs, leader election, and quorum acknowledgements to keep nodes ordered through failures.",
	upgradeBoostedBy: ["flight", "exec"],
	upgradeCost: new Decimal(1),
	buyableTitle: "MapReduce Job",
	buyableResource: "MapReduce jobs",
	buyableBase: 3,
	buyablePower: 1.25,
	milestoneAt: 3,
	milestoneText: "Shuffle partitioning and straggler mitigation become part of distributed execution.",
	hotkey: "u",
})

function directBuyableEffect(layer, id, fallback = 1) {
	if (!player[layer]) return new Decimal(fallback)
	if (!layers[layer] || !layers[layer].buyables || !layers[layer].buyables[id]) return new Decimal(fallback)
	let buyable = layers[layer].buyables[id]
	if (!buyable.effect) return new Decimal(fallback)
	return buyable.effect.call({layer, id}, getBuyableAmount(layer, id))
}

function multiplyGain(layer, multiplier) {
	let oldGainMult = layers[layer].gainMult
	layers[layer].gainMult = function() {
		return oldGainMult.call(this).times(multiplier())
	}
}

function multiplyEffect(layer, multiplier) {
	let oldEffect = layers[layer].effect
	layers[layer].effect = function() {
		return oldEffect.call(this).times(multiplier())
	}
}

function multiplyPassive(layer, multiplier) {
	let oldPassiveGeneration = layers[layer].passiveGeneration
	layers[layer].passiveGeneration = function() {
		return oldPassiveGeneration.call(this).times(multiplier())
	}
}

function hasDistPosture() {
	return hasUpgrade("dist", 21) || hasUpgrade("dist", 22) || hasUpgrade("dist", 23)
}

function distPostureEffect() {
	if (hasUpgrade("dist", 21)) return upgradeEffect("dist", 21)
	if (hasUpgrade("dist", 22)) return upgradeEffect("dist", 22)
	if (hasUpgrade("dist", 23)) return upgradeEffect("dist", 23)
	return new Decimal(1)
}

function lowerRateEffect(layer) {
	return directBuyableEffect(layer, 11).sqrt()
}

function addDeepBuyable(layer, id, config) {
	layers[layer].buyables[id] = {
		title: config.title,
		cost(x) {
			let cost = Decimal.pow(config.base || 2, x.add(1)).times(config.cost || 1)
			cost = cost.times(targetedCostReduction(layer, id))
			return cost.max(1).floor()
		},
		effect(x) {
			return x.add(1).pow(config.power || 1)
		},
		display() {
			return "You have " + formatWhole(getBuyableAmount(this.layer, this.id)) + " " + config.resource
				+ "<br><br>Effect: " + format(directBuyableEffect(this.layer, this.id)) + "x " + config.effectText
				+ "<br><br>Cost: " + format(tmp[this.layer].buyables[this.id].cost) + " " + (config.costResource || tmp[config.currency || this.layer].resource)
		},
		canAfford() {
			return sourceAmount(config.currency || this.layer).gte(tmp[this.layer].buyables[this.id].cost)
		},
		buy() {
			spendSource(config.currency || this.layer, tmp[this.layer].buyables[this.id].cost)
			setBuyableAmount(this.layer, this.id, getBuyableAmount(this.layer, this.id).add(1))
		},
		unlocked() {
			return !config.unlocked || config.unlocked()
		},
	}
}

function addDeepUpgrade(layer, id, config) {
	layers[layer].upgrades[id] = {
		fullDisplay() {
			return config.title + "<br><br>" + config.description
				+ "<br><br>Currently: " + format(this.effect()) + "x"
				+ "<br><br>Cost: " + format(config.cost) + " " + (config.costResource || tmp[config.currency || this.layer].resource)
		},
		effect: config.effect,
		canAfford() {
			return sourceAmount(config.currency || this.layer).gte(config.cost)
		},
		pay() {
			spendSource(config.currency || this.layer, config.cost)
		},
		unlocked() {
			return !config.unlocked || config.unlocked()
		},
	}
}

function buyableName(layer, id) {
	if (layers[layer] && layers[layer].buyables && layers[layer].buyables[id]) return layers[layer].buyables[id].title
	return "buyable " + id
}

function addTargetedDiscountBuyable(layer, id, title, resource, targetLayer, targetId, config = {}) {
	targetedDiscounts.push({
		sourceLayer: layer,
		sourceId: id,
		targetLayer,
		targetId,
		rate: config.rate || 0.9,
	})
	layers[layer].buyables[id] = {
		title,
		cost(x) {
			return Decimal.pow(config.base || 2, x.add(1)).times(config.cost || 2).max(1).floor()
		},
		effect(x) {
			return Decimal.pow(config.rate || 0.9, x)
		},
		display() {
			return "You have " + formatWhole(getBuyableAmount(this.layer, this.id)) + " " + resource
				+ "<br><br>Effect: " + formatSmall(directBuyableEffect(this.layer, this.id)) + "x " + buyableName(targetLayer, targetId) + " cost"
				+ "<br><br>Cost: " + format(tmp[this.layer].buyables[this.id].cost) + " " + tmp[this.layer].resource
		},
		canAfford() {
			return layerPoints(this.layer).gte(tmp[this.layer].buyables[this.id].cost)
		},
		buy() {
			player[this.layer].points = player[this.layer].points.sub(tmp[this.layer].buyables[this.id].cost)
			setBuyableAmount(this.layer, this.id, getBuyableAmount(this.layer, this.id).add(1))
		},
		unlocked() {
			return layerPoints(this.layer).gt(0) || player[this.layer].best.gt(0) || player[this.layer].total.gt(0)
		},
	}
}

addTargetedDiscountBuyable("fmt", 21, "Page Footer Index", "page footer indexes", "row", 11)
addTargetedDiscountBuyable("simd", 21, "Vectorized Parser", "vectorized parsers", "row", 12)
addTargetedDiscountBuyable("sch", 21, "Constraint Propagator", "constraint propagators", "rel", 11)
addTargetedDiscountBuyable("qry", 21, "Predicate Pushdown Rule", "predicate pushdown rules", "alg", 11)
addTargetedDiscountBuyable("cat", 21, "Catalog Cache", "catalog caches", "sch", 11)
addTargetedDiscountBuyable("met", 21, "Metric Rewrite", "metric rewrites", "ds", 11)
addTargetedDiscountBuyable("exec", 21, "Kernel Fusion Rule", "kernel fusion rules", "vec", 11)
addTargetedDiscountBuyable("opt", 21, "Cost Bound", "cost bounds", "exec", 11)
addTargetedDiscountBuyable("dash", 21, "Filter State Cache", "filter state caches", "panel", 11)
addTargetedDiscountBuyable("onto", 21, "Identity Index", "identity indexes", "sem", 11)
addTargetedDiscountBuyable("dist", 21, "Placement Policy", "placement policies", "db", 11)

addDeepBuyable("qry", 12, {
	title: "Prepared Statement Cache",
	resource: "prepared plans",
	effectText: "executor reuse and optimizer feedback",
	costResource: "queries",
	cost: new Decimal(12),
	base: 2.4,
	power: 0.85,
	unlocked() {return hasMilestone("qry", 0) || layerPoints("exec").gt(0)},
})

addDeepBuyable("stat", 12, {
	title: "HyperLogLog Sketch",
	resource: "NDV sketches",
	effectText: "cardinality estimates and optimizer feedback",
	costResource: "histograms",
	cost: new Decimal(8),
	base: 2.2,
	power: 0.75,
	unlocked() {return hasUpgrade("stat", 11) || layerPoints("opt").gt(0)},
})

addDeepBuyable("cat", 12, {
	title: "Lineage Edge Index",
	resource: "lineage indexes",
	effectText: "semantic joins, impact analysis, and database planning",
	costResource: "catalogs",
	cost: new Decimal(6),
	base: 2.4,
	power: 0.8,
	unlocked() {return hasUpgrade("cat", 11) || layerPoints("sem").gt(0)},
})

addDeepBuyable("exec", 12, {
	title: "Selection Vector",
	resource: "selection vectors",
	effectText: "late materialization and vectorized execution",
	costResource: "executors",
	cost: new Decimal(4),
	base: 2.2,
	power: 0.9,
	unlocked() {return hasMilestone("exec", 0) || layerPoints("opt").gt(0)},
})

addDeepBuyable("opt", 12, {
	title: "Plan Cache Entry",
	resource: "plan cache entries",
	effectText: "plan reuse and distributed scheduling",
	costResource: "plans",
	cost: new Decimal(5),
	base: 2.35,
	power: 0.85,
	unlocked() {return hasUpgrade("opt", 11) || layerPoints("dist").gt(0)},
})

addDeepBuyable("db", 12, {
	title: "WAL Segment",
	resource: "WAL segments",
	effectText: "durability, recovery, and distributed writes",
	costResource: "databases",
	cost: new Decimal(2),
	base: 2.6,
	power: 1.1,
	unlocked() {return hasUpgrade("db", 11) || hasMilestone("db", 0)},
})

addDeepBuyable("sem", 12, {
	title: "Conformed Dimension",
	resource: "conformed dimensions",
	effectText: "dashboard consistency and ontology mapping",
	costResource: "semantic layers",
	cost: new Decimal(3),
	base: 2.4,
	power: 1,
	unlocked() {return hasUpgrade("sem", 11) || layerPoints("dash").gt(0)},
})

addDeepBuyable("dash", 12, {
	title: "Parameter Bus",
	resource: "parameter buses",
	effectText: "crossfilter state and semantic reuse",
	costResource: "dashboards",
	cost: new Decimal(2),
	base: 2.5,
	power: 0.9,
	unlocked() {return hasUpgrade("dash", 11) || layerPoints("dist").gt(0)},
})

addDeepBuyable("onto", 12, {
	title: "Temporal Part",
	resource: "temporal parts",
	effectText: "identity resolution and architecture exchange semantics",
	costResource: "ontologies",
	cost: new Decimal(3),
	base: 2.5,
	power: 1.1,
	unlocked() {return hasUpgrade("onto", 11) || layerPoints("dist").gt(0)},
})

addDeepBuyable("flight", 12, {
	title: "Ticket Lease",
	resource: "ticket leases",
	effectText: "backpressure, transport reuse, and cluster ingress",
	costResource: "Flight protocols",
	cost: new Decimal(3),
	base: 2.25,
	power: 0.9,
	unlocked() {return hasUpgrade("flight", 11) || layerPoints("dist").gt(0)},
})

addDeepBuyable("dist", 12, {
	title: "Shuffle Partition",
	resource: "shuffle partitions",
	effectText: "distributed execution and fault isolation",
	costResource: "distributed systems",
	cost: new Decimal(2),
	base: 2.5,
	power: 1.2,
	unlocked() {return hasUpgrade("dist", 11) || hasMilestone("dist", 0)},
})

addDeepUpgrade("opt", 12, {
	title: "Cardinality Feedback Loop",
	description: "Feed actual executor row counts back into statistics so bad estimates stop repeating.",
	cost: new Decimal(8),
	costResource: "plans",
	effect() {
		return directBuyableEffect("stat", 12).times(directBuyableEffect("exec", 12)).sqrt()
	},
	unlocked() {return hasMilestone("opt", 0) || layerPoints("dist").gt(0)},
})

addDeepUpgrade("sem", 12, {
	title: "Policy-Aware SQL",
	description: "Compile semantic models with access policy, valid grains, and conformed dimensions already applied.",
	cost: new Decimal(6),
	costResource: "semantic layers",
	effect() {
		return directBuyableEffect("cat", 12).times(directBuyableEffect("dash", 12)).sqrt()
	},
	unlocked() {return hasMilestone("sem", 0) || layerPoints("onto").gt(0)},
})

addDeepUpgrade("onto", 12, {
	title: "Reasoning Materializer",
	description: "Materialize inferred relationships so dashboards and distributed services can use ontology links at runtime.",
	cost: new Decimal(4),
	costResource: "ontologies",
	effect() {
		return directBuyableEffect("sem", 12).times(directBuyableEffect("db", 12)).sqrt()
	},
	unlocked() {return hasMilestone("onto", 0) || layerPoints("dist").gt(0)},
})

addDeepUpgrade("flight", 12, {
	title: "Backpressure Credits",
	description: "Issue stream credits so transport, executors, and distributed shuffles pace each other instead of flooding.",
	cost: new Decimal(6),
	costResource: "Flight protocols",
	effect() {
		return directBuyableEffect("flight", 12).times(layerBoost("net")).sqrt()
	},
	unlocked() {return hasMilestone("flight", 0) || layerPoints("dist").gt(0)},
})

layers.dist.upgrades[21] = {
	fullDisplay() {
		return "CP Quorum Reads<br><br>Choose consistency during partitions. WAL segments and ticket leases boost distributed system gain."
			+ "<br><br>Currently: " + format(this.effect()) + "x"
			+ "<br><br>Cost: 3 distributed systems"
	},
	effect() {
		return directBuyableEffect("db", 12).times(directBuyableEffect("flight", 12)).sqrt()
	},
	canAfford() {return layerPoints("dist").gte(3)},
	pay() {player.dist.points = player.dist.points.sub(3)},
	unlocked() {return hasUpgrade("dist", 21) || (hasUpgrade("dist", 11) && !hasDistPosture())},
}

layers.dist.upgrades[22] = {
	fullDisplay() {
		return "AP Anti-Entropy<br><br>Choose availability during partitions. Shuffle partitions boost distributed system autogain."
			+ "<br><br>Currently: " + format(this.effect()) + "x passive distributed gain"
			+ "<br><br>Cost: 3 distributed systems"
	},
	effect() {
		return directBuyableEffect("dist", 12).sqrt()
	},
	canAfford() {return layerPoints("dist").gte(3)},
	pay() {player.dist.points = player.dist.points.sub(3)},
	unlocked() {return hasUpgrade("dist", 22) || (hasUpgrade("dist", 11) && !hasDistPosture())},
}

layers.dist.upgrades[23] = {
	fullDisplay() {
		return "CA Single-Zone Illusion<br><br>Choose low-latency coordination when partitions are out of scope. Dashboards and executors boost the finished surface."
			+ "<br><br>Currently: " + format(this.effect()) + "x"
			+ "<br><br>Cost: 3 distributed systems"
	},
	effect() {
		return directBuyableEffect("dash", 12).times(directBuyableEffect("exec", 12)).sqrt()
	},
	canAfford() {return layerPoints("dist").gte(3)},
	pay() {player.dist.points = player.dist.points.sub(3)},
	unlocked() {return hasUpgrade("dist", 23) || (hasUpgrade("dist", 11) && !hasDistPosture())},
}

multiplyGain("rel", () => lowerRateEffect("sch").times(lowerRateEffect("stat")))
multiplyGain("db", () => lowerRateEffect("fmt").times(lowerRateEffect("cat")))
multiplyGain("qry", () => directBuyableEffect("exec", 12).sqrt())
multiplyGain("exec", () => directBuyableEffect("qry", 12).times(directBuyableEffect("opt", 12)))
multiplyGain("opt", () => directBuyableEffect("stat", 12).times(directBuyableEffect("exec", 12)).times(hasUpgrade("opt", 12) ? upgradeEffect("opt", 12) : 1))
multiplyGain("db", () => directBuyableEffect("cat", 12).times(directBuyableEffect("dist", 12)))
multiplyGain("sem", () => directBuyableEffect("cat", 12).times(directBuyableEffect("dash", 12)).times(hasUpgrade("sem", 12) ? upgradeEffect("sem", 12) : 1))
multiplyGain("onto", () => directBuyableEffect("sem", 12).times(directBuyableEffect("db", 12)).times(hasUpgrade("onto", 12) ? upgradeEffect("onto", 12) : 1))
multiplyGain("dist", () => directBuyableEffect("flight", 12).times(directBuyableEffect("db", 12)).times(directBuyableEffect("onto", 12)).times(distPostureEffect()))

multiplyEffect("dash", () => directBuyableEffect("sem", 12).times(directBuyableEffect("onto", 12)))
multiplyEffect("exec", () => directBuyableEffect("qry", 12).times(directBuyableEffect("opt", 12)))
multiplyEffect("db", () => directBuyableEffect("cat", 12))
multiplyEffect("dist", () => directBuyableEffect("flight", 12).times(directBuyableEffect("db", 12)).times(hasUpgrade("dist", 23) ? upgradeEffect("dist", 23) : 1))

multiplyPassive("dist", () => hasUpgrade("dist", 22) ? upgradeEffect("dist", 22).min(4) : new Decimal(1))

function enableDeepAutobuy(layer) {
	let oldAutomate = layers[layer].automate || function() {}
	layers[layer].automate = function() {
		oldAutomate.call(this)
		if (!hasMilestone(this.layer, 0)) return
		let buyables = Object.keys(layers[this.layer].buyables).sort((left, right) => Number(left) - Number(right))
		for (let index = 0; index < buyables.length; index++) {
			buyBuyable(this.layer, Number(buyables[index]))
		}
	}
}

for (let layer in layers) {
	if (layers[layer].row >= 3) enableDeepAutobuy(layer)
}
