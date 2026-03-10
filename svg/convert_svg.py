import sys
import os
from lxml import etree

def process_svg(input_path):
    namespaces = {'svg': 'http://www.w3.org/2000/svg'}
    
    try:
        parser = etree.XMLParser(remove_blank_text=True)
        tree = etree.parse(input_path, parser)
        root = tree.getroot()

        text_tags = root.xpath('//svg:text', namespaces=namespaces)

        for text in text_tags:
            text_id = text.get('id', 'no-id')
            
            # Find all child tspans
            tspans = text.xpath('./svg:tspan', namespaces=namespaces)
            
            if not tspans:
                continue

            # We'll collect the valid text and then clear the element
            combined_text = ""
            for tspan in tspans:
                val = tspan.text if tspan.text else ""
                # Only process if it's not the ignored "-"
                if val.strip() != "-":
                    combined_text += val
            
            # Remove all children (tspans, comments, etc.) to flatten it
            for child in list(text):
                text.remove(child)

            # If we found valid text, update the parent <text> tag
            if combined_text:
                # Apply the specific formatting
                text.text = f"${{{text_id}}}"
            else:
                text.text = f"${{{text_id}}}"
                
                # Ensure centering attributes are on the parent
                text.set('text-anchor', 'middle')
                text.set('dominant-baseline', 'central')

        base, ext = os.path.splitext(input_path)
        output_path = f"{base}_modified{ext}"
        
        tree.write(output_path, encoding='utf-8', xml_declaration=True, pretty_print=True)
        print(f"Success! Created: {output_path}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python script.py <path_to_svg>")
    else:
        process_svg(sys.argv[1])
