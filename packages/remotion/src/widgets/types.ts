export type WidgetPropType = 'string' | 'number' | 'boolean' | 'enum' | 'object';

export interface VidoraWidgetProp {
  name: string;
  type: WidgetPropType;
  required?: boolean;
  default?: unknown;
  enum_values?: string[];
  description?: string;
}

export interface VidoraWidgetDefinition {
  id: string;
  name: string;
  category?: string;
  description?: string;
  import_path?: string;
  is_custom?: boolean;
  props?: VidoraWidgetProp[];
  default_props?: Record<string, unknown>;
  example_snippet?: string;
  tags?: string[];
  tsx_code: string;
}

export interface VidoraWidgetPackage {
  vidora_schema_version?: string;
  exported_at?: string;
  generator?: string;
  widgets: VidoraWidgetDefinition[];
}
