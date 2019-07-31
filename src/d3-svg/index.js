import { 
	forceSimulation,
	forceManyBody,
	forceLink,
	forceCenter,
	forceX,
	forceY
} from 'd3-force';
import { scaleOrdinal as ordinal } from 'd3-scale';
import { zoom } from 'd3-zoom';
import { select, event } from 'd3-selection';
import { drag } from 'd3-drag';

function draw(DOMNode, graph) {
	const { nodes, edges } = graph;
	const links = edges;
	const width = 800;
	const height = 600;
	const svg = select(DOMNode);
	svg.append("svg:defs").selectAll("marker")
    .data(["end"])      // Different link/path types can be defined here
  .enter().append("svg:marker")    // This section adds in the arrows
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 15)
    .attr("refY", -1.5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
  .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");
	const container = svg.append('g');

	const adjList = edges.reduce((a, c) => {
		a[`${c.source}-${c.target}`] = a[`${c.source}-${c.target}`] ? a[`${c.source}-${c.target}`] + 1 : 1;
		a[`${c.target}-${c.source}`] = a[`${c.target}-${c.source}`] ? a[`${c.target}-${c.source}`] + 1 : 1;
		return a;
	}, {});

	const neigh = (a, b) => {
		return a === b || adjList[`${a}-${b}`];
	};

	const getNeighLinks = (source, target) => {
      var siblings = [];
      for(var i = 0; i < edges.length; ++i) {
      	  const { source, target } = edges[i];
          if(neigh(source, target)) {
            siblings.push(edges[i].amount);
          }
      }
      return siblings;
  };


	const linkArc = (d) => {
		const dx = (d.target.x - d.source.x);
        const dy = (d.target.y - d.source.y);
        const dr = Math.sqrt(dx * dx + dy * dy);
        const unevenCorrection = (d.sameUneven ? 0 : 0.5);
        const arc = ((dr * d.maxSameHalf) / (d.sameIndexCorrected - unevenCorrection));

        if (d.sameMiddleLink) {
            arc = 0;
        }

        return "M" + d.source.x + "," + d.source.y + "A" + arc + "," + arc + " 0 0," + d.sameArcDirection + " " + d.target.x + "," + d.target.y;
	}

	links.forEach((link) => {
		const same = links.filter(l => l.source === link.source && l.target === link.target)
		const sameAlt = links.filter(l => l.target === link.source && l.source === link.target)
		const sameAll = same.concat(sameAlt)
		sameAll.forEach((l, idx) => {
			l.sameIndex = idx + 1;
			l.sameTotal = sameAll.length;
			l.sameTotalHalf = l.sameTotal / 2;
			l.sameUneven = ((l.sameTotal % 2) !== 0);
			l.sameMiddleLink = ((l.sameUneven === true) && (Math.ceil(l.sameTotalHalf) === l.sameIndex));
            l.sameLowerHalf = (l.sameIndex <= l.sameTotalHalf);
            l.sameArcDirection = l.sameLowerHalf ? 0 : 1;
            l.sameIndexCorrected = l.sameLowerHalf ? l.sameIndex : (l.sameIndex - Math.ceil(l.sameTotalHalf));
		})
	});

	const maxSame = links.sort((a, b) => a.sameTotal > b.sameTotal ? 1 : 1)[0].sameTotal
	links.forEach(l => l.maxSameHalf = Math.floor(maxSame / 3))


	const link = container.append('g')
						  .attr('class', 'links')
				          .selectAll('path')
				          .data(edges)
				          .enter()
				          .append('path')
				          .attr('stroke', '#aaa')
				          .attr('stroke-width', '2px')
				          .attr('marker-end', d => 'url(#end)');

	const node = container.append('g')
						  .attr('class', 'nodes')
						  .selectAll('circle')
						  .data(nodes)
						  .enter()
						  .append('circle')
						  .attr('r', 8)
						  .attr('fill', '#000');

	const focus = () => {
		const index = select(event.target).datum().index;
		node.style('opacity', (o) => {
			return neigh(index, o.index) ? 1 : .1;
		});
		link.style('opacity', (o) => {
			return o.source.index === index || o.target.index ? 1 : .1;
		});
	};

	const unFocus = () => {
		node.style('opacity', 1);
		link.style('opacity', 1);
	};

	const fixna = x => x ? x : 0;

	const updateNode = (n) => {
		n.attr('transform', d => `translate(${d.x}, ${d.y})`);
	};

	const updateArcLink = (l) => {
		l.attr('d', linkArc);
	}

	node.on('mouseover', focus)
		.on('mouseout', unFocus);
	
	const ticked = () => {
		node.call(updateNode);
		link.call(updateArcLink);
	};

	const graphLayout = forceSimulation(nodes);

	graphLayout.force('charge', forceManyBody().strength(-200))
				.force('center', forceCenter(width / 2, height / 2))
				.force('x', forceX(width / 2).strength(1))
				.force('y', forceY(height / 2).strength(1))
				.force('link', forceLink(edges).id(d => d.id).distance(500).strength(1))
				.on('tick', ticked);

	svg.call(zoom().scaleExtent([.1, 10]).on('zoom', () => {
		container.attr('transform', event.transform);
	}));

	const dragstarted = (d) => {
		event.sourceEvent.stopPropagation();
		const { active } = event;
		if (active === 0) {
			graphLayout.alphaTarget(.15).restart();
		}
		d.fx = d.x;
		d.fy = d.y
	};

	const dragged = (d) => {
		d.fx = event.x;
		d.fy = event.y;
	};

	const dragended = (d) => {
		const { active } = event;
		if (active === 0) {
			graphLayout.alphaTarget(.20);
		}
		d.fx = null;
		d.fy = null;
	};

	node.call(drag()
		.on('start', dragstarted)
		.on('drag', dragged)
		.on('end', () => {})
	);
}

export default draw;
