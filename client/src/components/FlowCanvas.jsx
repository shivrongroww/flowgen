import dagre from 'dagre';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap, MarkerType,
  useReactFlow, getNodesBounds, getViewportForBounds,
  Handle, Position,
} from 'reactflow';
import { toPng } from 'html-to-image';
import 'reactflow/dist/style.css';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 48;
const DECISION_WIDTH = 172;
const DECISION_HEIGHT = 86;

const baseNode = {
  padding: '12px 26px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: '600',
  fontFamily: 'Inter, system-ui, sans-serif',
  cursor: 'grab',
  width: NODE_WIDTH,
  textAlign: 'center',
  letterSpacing: '0.01em',
};

const nodeStyles = {
  start:     { ...baseNode, background: '#f0e040', color: '#111', border: 'none' },
  input:     { ...baseNode, background: '#f0e040', color: '#111', border: 'none' },
  end:       { ...baseNode, background: '#9b9fe4', color: '#fff', border: 'none' },
  output:    { ...baseNode, background: '#9b9fe4', color: '#fff', border: 'none' },
  primary:   { ...baseNode, background: '#9b9fe4', color: '#fff', border: 'none' },
  default:   { ...baseNode, background: '#9b9fe4', color: '#fff', border: 'none' },
  secondary: { ...baseNode, background: 'transparent', color: '#fff', border: '1.5px solid #fff' },
  error:     { ...baseNode, background: '#ff6030', color: '#fff', border: 'none' },
};

function getNodeStyle(node) {
  return nodeStyles[node.type] || nodeStyles.default;
}

function DecisionNode({ data }) {
  const handleStyle = { background: '#666', border: 'none', width: 8, height: 8 };
  return (
    <div style={{ width: DECISION_WIDTH, height: DECISION_HEIGHT, position: 'relative' }}>
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <div style={{
        width: '100%',
        height: '100%',
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        background: '#f0c040',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: '700',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#111',
          textAlign: 'center',
          lineHeight: 1.3,
          padding: '0 40px',
          display: 'block',
        }}>
          {data.label}
        </span>
      </div>
      <Handle type="source" position={Position.Right} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="b" style={handleStyle} />
    </div>
  );
}

const nodeTypes = { decision: DecisionNode };

function applyDagreLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 });

  nodes.forEach((n) => {
    const w = n.type === 'decision' ? DECISION_WIDTH : NODE_WIDTH;
    const h = n.type === 'decision' ? DECISION_HEIGHT : NODE_HEIGHT;
    g.setNode(n.id, { width: w, height: h });
  });
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const w = n.type === 'decision' ? DECISION_WIDTH : NODE_WIDTH;
    const h = n.type === 'decision' ? DECISION_HEIGHT : NODE_HEIGHT;
    return {
      ...n,
      ...(n.type !== 'decision' && { style: getNodeStyle(n) }),
      position: {
        x: pos.x - w / 2,
        y: pos.y - h / 2,
      },
    };
  });
}

const edgeDefaults = {
  type: 'smoothstep',
  style: { stroke: '#444', strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#444' },
  labelStyle: { fill: '#777', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' },
  labelBgStyle: { fill: '#111', fillOpacity: 0.8 },
  labelBgPadding: [4, 6],
};

function styledEdges(edges) {
  return edges.map((e) => ({ ...edgeDefaults, ...e, style: { ...edgeDefaults.style, ...(e.style || {}) } }));
}

function CopyCapture({ containerRef, forwardedRef }) {
  const { getNodes } = useReactFlow();

  useImperativeHandle(forwardedRef, () => ({
    async captureImage() {
      const nodes = getNodes();
      const bounds = getNodesBounds(nodes);
      const padding = 60;
      const imageWidth = bounds.width + padding * 2;
      const imageHeight = bounds.height + padding * 2;
      const viewport = getViewportForBounds(bounds, imageWidth, imageHeight, 0.5, 2);

      const viewportEl = containerRef.current?.querySelector('.react-flow__viewport');
      return toPng(viewportEl, {
        backgroundColor: '#111111',
        width: imageWidth,
        height: imageHeight,
        style: {
          width: imageWidth,
          height: imageHeight,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
        pixelRatio: 2,
      });
    },
  }));

  return null;
}

export default forwardRef(function FlowCanvas({ nodes: initialNodes, edges: initialEdges }, ref) {
  const containerRef = useRef(null);
  const layoutedNodes = applyDagreLayout(initialNodes, initialEdges);
  const layoutedEdges = styledEdges(initialEdges);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        key={JSON.stringify(initialNodes)}
        defaultNodes={layoutedNodes}
        defaultEdges={layoutedEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        attributionPosition="bottom-right"
      >
        <CopyCapture containerRef={containerRef} forwardedRef={ref} />
        <Background color="#222" gap={24} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'decision') return '#f0c040';
            const s = getNodeStyle(n);
            return s.background === 'transparent' ? '#fff' : s.background;
          }}
          maskColor="rgba(17,17,17,0.75)"
          style={{ background: '#1a1a1a', border: '1px solid #2e2e2e' }}
        />
      </ReactFlow>
    </div>
  );
});
