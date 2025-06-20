const SchemaViewerPortal = (props: any) => {
  console.log('props', props);
  return (
    <div id={`${props.id}-${props.file}-SchemaViewer-portal`} data-expand={props.expand} data-max-height={props.maxHeight} />
  );
};

export default SchemaViewerPortal;
