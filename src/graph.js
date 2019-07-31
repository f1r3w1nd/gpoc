import { linear, pow } from 'd3-scale';
import { 
	forceSimulation,
	forceManyBody,
	forceLink,
	forceCenter,
	forceCollide,
	forceX,
	forceY
} from 'd3-force';
import { behavior } from 'd3-zoom';
import { symbolCircle } from 'd3-shape';
import { select, event } from 'd3-selection';
import { drag } from 'd3-drag';

/**
 * @param  {DOMnode} node The node where the graph is going to be drawn on
 * @param  {Object} graph the javascript object that represents the graph
 * @return {void}
 */
const draw = (DOMNode, graph) => {
	console.log(graph);
	const { width, height } = DOMNode;
	const { edges, nodes } = graph;
	const color = '#000';
	const nodeSymbol = symbolCircle;
	const nodeRadius = 24;
	const svg = select(DOMNode);
	const g = svg.append('g');
	let link = g.append('g').selectAll('link');
	let node = g.append('g').selectAll('node');
	const tooltip = svg
					.append('div')
					.attr('class', 'tooltip')
					.style('opacity', '0');
	const restart = () => {
		edges.forEach((edge) => {
			const same = edges.filter(e => e.source === edge.source && e.target === edge.target);
			const sameReverse = edges.filter(e => e.target === edge.source && e.source === edge.target);
			const sameAll = same.concat(sameReverse);

			sameAll.forEach((s, i) => {
			  edge.sameIndex = (i + 1);
		      edge.sameTotal = sameAll.length;
		      edge.sameTotalHalf = (edge.sameTotal / 2);
		      edge.sameUneven = ((edge.sameTotal % 2) !== 0);
		      edge.sameMiddleLink = ((edge.sameUneven === true) && 
		                          (Math.ceil(edge.sameTotalHalf) === edge.sameIndex));
		      edge.sameLowerHalf = (edge.sameIndex <= edge.sameTotalHalf);
		      edge.sameArcDirection = edge.sameLowerHalf ? 0 : 1;
		      edge.sameIndexCorrected = edge.sameLowerHalf ? edge.sameIndex : (edge.sameIndex - Math.ceil(edge.sameTotalHalf));
		    });
		  }); 
		const maxSame = edges.reduce((a, c) => {
			if ( c.sameTotal > a) {
				return c.sameTotal;
			}
			return a;
		}, -1);
		edges.forEach((edge) => {
			edge.maxSameHalf = Math.round(maxSame / 2);
		});
	};
	
	const edgeTooltipHtml = (edge) => {
		const { source, target, transactionType, amount, currency } = edge;
		return `
			<h5>${transactionType}</h5>
			<hr />
			<p>Source: ${source}</p>
			<p>Target: ${target}</p>
			<p>Amount: (${currency}) ${amount}</p>
		`;
	};
	const nodeTooltipHtml = (node) => {
		const { name, surName, cif } = node;
		return `
			<h5>${cif}</h5>
			<hr />
			<p>Name: ${name}</p>
			<p>Surname: ${surName}</p>
		`;
	};
	const linkedByIndex = {};
	edges.forEach(d => {
	  linkedByIndex[`${d.source},${d.target}`] = 1;
	});

    const isConnected = (a, b) => linkedByIndex[`${a},${b}`] || linkedByIndex[`${b},${a}`] || a === b;

	const linkFade = (opacity) => {
		return (d) => {
			node.style('stroke-opacity', (o) => {
				const thisOpacity = isConnected(d.source, o) && isConnected(d.target, 0) ? 1 : opacity;
				o.setAttribute('fill-opacity', thisOpacity);
				return thisOpacity;
			});
		};
	};

	const fade = (opacity) => {
		return (d) => {
			node.style('stroke-opacity', (o) => {
				const thisOpacity = isConnected(d, 0) ? 1 : opacity;
				d.setAttribute('fill-opacity', thisOpacity);
				return thisOpacity;
			});
		}; 
	};

	const linkArc = (d) => {
		const dx = d.target.x - d.source.y;
		const dy = d.target.y - d.source.y;
		const dr = Math.sqrt((dx * dx) + (dy * dy));
		const unevenCorrection = d.sameUneven ? 0 : 0.5;
		const curvature = 2.0;
		let arc = (1.0/curvature) * ((dr * d.maxSameHalf) / (d.sameIndexCorrected - unevenCorrection));
		if (d.sameMiddleLink) {
			arc = 0;
		}
		return `M${d.source.x},${d.source.y},A${arc},${arc}0 0,${d.sameArcDirect}`;
	}

	const ticked = () => {
		link.attr('d', linkArc);
		node.attr('transform', d => `tranlate(${d.x}, ${d.y})`);
	};
	
	const simulation = forceSimulation(nodes) 
		.force('link', forceLink().id(d => d.id))
	  	.force("charge", forceManyBody().strength(-1000))
	  	.force("link", forceLink(edges).distance(200))
	    .force('center', forceCenter(width / 2, height / 2))
	    .force('collide', forceCollide(25))
	  	.force("x", forceX())
	  	.force("y", forceY())
	  	.alphaTarget(1)
	    .on('tick', ticked);

	const dragstarted = (d) => {
      if (event.active) {
      	simulation.alphaTarget(0.3).restart();
      }
      d.fx = d.x;
      d.fy = d.y;
	}; 
	 
	const dragged = (d) => {
      d.fx = event.x;
      d.fy = event.y;
	};

    const dragended = (d) => {
      if (event.active) {
      	simulation.alphaTarget(0);
      }
    };

	// Draw links
	link.data(edges).enter().append('path').attr('stroke', '#939598');

	// Add mouseover events to links
	link.attr('class', 'link')
		.on('mouseover.fade', linkFade(0.1))
		.on('mouseover.tooltip', (hoveredLink) => {
			tooltip.transition()
					.duration(300)
					.style('opacity', .8);
			tooltip.html((edgeTooltipHtml(hoveredLink)))
					.style('left', `${event.pageX}px`)
					.style('top', `${event.pageY}px`)
		})
		.on('mouseout.tooltip', () => {
			tooltip.transition()
				   .duration(100)
				   .style('opacity', 0);
		})
		.on('mouseout.fade', linkFade(1))
		.on('mousemove', () => {
			tooltip.style('left', `${event.pageX}px`)
				   .style('top', `${event.pageY + 10}px`);
		});

	link.exit().transition()
	    	.attr("stroke-opacity", 0)
			.remove();
	    
    link = link.enter().append('path')
    		.call(function(link) {link.transition().attr("stroke-opacity", 1);})
    		.call(function(link) {link.transition().attr("d", linkArc)})
    		.call(function(link) {link.transition().attr('stroke', function(d){return color(d.T);})})
    	.merge(link);


	node = node.data(nodes , d => d.id)
	node.exit()
		.transition()
		.attr('r', 0)
		.remove();

	node.enter()
		.append('circle')
		.call((n) => {
			n.transition().attr('r', nodeRadius);
		})
		.merge(node);

	// Drag behavior
	node = g.selectAll('.node')
			  .data(nodes)
			  .enter().append('g')
			  .attr('class', 'node')
			  .call(
			  	drag().on('start', dragstarted)
			  		  .on('drag', dragged)
			  		  .on('end', dragended)
			  );	
	// Draw nodes
	node.append('circle')
		.attr('r', nodeRadius)
		.attr('fill', '#CCC')
		.on('mouseover.tooltip', (d) => {
			tooltip.transition()
				   .duration(300)
				   .style('opacity', .8)
		    tooltip.html(nodeTooltipHtml(d))
		    	   .style('left', `${event.pageX}px`)
		    	   .style('top', `${event.pageY}px`)
		})
		.on('mouseout.fade', fade(1))
		.on('mousemove', () => {
			tooltip.style('left', `${event.pageX}px`)
				   .style('top', `${event.pageY}px`)
		})
		.on('dblclick', (d) => {
			d.fx = null;
			d.fy = null;
		});

	simulation.nodes(nodes);
	simulation.force('link').links(edges);
	simulation.alpha(1).restart();
}

export default draw;