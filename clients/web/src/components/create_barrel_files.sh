#!/bin/bash

# Script to create barrel files for all components
COMPONENTS_DIR="/Users/kloudcoder/VSCodeProjects/gringoX/clients/web/src/components"

# Get all component directories
find "$COMPONENTS_DIR" -type d -not -path "*/\.*" -not -path "$COMPONENTS_DIR" | while read -r dir; do
  component_name=$(basename "$dir")
  
  # Skip auth and profile directories as they already have their own structure
  if [[ "$component_name" == "auth" || "$component_name" == "profile" ]]; then
    continue
  fi
  
  # Check if the barrel file already exists
  barrel_file="$COMPONENTS_DIR/$component_name.jsx"
  if [[ ! -f "$barrel_file" ]]; then
    echo "Creating barrel file for $component_name"
    
    # Create the barrel file
    cat > "$barrel_file" << EOF
import ${component_name} from './${component_name}/index';
export default ${component_name};
EOF
  fi
done

echo "Barrel files creation complete!" 