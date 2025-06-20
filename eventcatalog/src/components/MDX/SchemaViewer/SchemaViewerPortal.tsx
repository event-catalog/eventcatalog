const SchemaViewerPortal = (props: any) => {
  // Convert string props to booleans (MDX passes strings)
  const expandBool = props.expand === true || props.expand === 'true';
  const searchBool = props.search !== false && props.search !== 'false';

  return (
    <div
      id={`${props.id}-${props.file}-SchemaViewer-portal`}
      data-expand={expandBool ? 'true' : 'false'}
      data-max-height={props.maxHeight}
      data-search={searchBool ? 'true' : 'false'}
    />
  );
};

export default SchemaViewerPortal;
