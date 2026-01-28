-- Agregar columna descuento_porcentual a la tabla productos
-- Esta columna almacenará el porcentaje de descuento aplicado a un producto específico

-- Agregar columna de descuento porcentual
ALTER TABLE public.productos
ADD COLUMN IF NOT EXISTS descuento_porcentual NUMERIC(5,2) DEFAULT 0 CHECK (descuento_porcentual >= 0 AND descuento_porcentual <= 100);

-- Agregar columna de precio de oferta
ALTER TABLE public.productos
ADD COLUMN IF NOT EXISTS precio_oferta NUMERIC(10,2) CHECK (precio_oferta >= 0);

-- Agregar columnas de vigencia del descuento
ALTER TABLE public.productos
ADD COLUMN IF NOT EXISTS fecha_vigencia_desde TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.productos
ADD COLUMN IF NOT EXISTS fecha_vigencia_hasta TIMESTAMP WITH TIME ZONE;

-- Agregar constraint para validar que la fecha desde sea anterior a la fecha hasta
ALTER TABLE public.productos
ADD CONSTRAINT productos_descuento_fechas_validas
CHECK (fecha_vigencia_hasta IS NULL OR fecha_vigencia_desde IS NULL OR fecha_vigencia_hasta > fecha_vigencia_desde);

-- Crear índice para mejorar las consultas que filtran por productos con descuento
CREATE INDEX IF NOT EXISTS productos_descuento_porcentual_idx ON public.productos(descuento_porcentual)
WHERE descuento_porcentual > 0;

-- Crear índice para productos con precio de oferta
CREATE INDEX IF NOT EXISTS productos_precio_oferta_idx ON public.productos(precio_oferta)
WHERE precio_oferta IS NOT NULL;

-- Crear índices para las fechas de vigencia
CREATE INDEX IF NOT EXISTS productos_fecha_vigencia_desde_idx ON public.productos(fecha_vigencia_desde)
WHERE fecha_vigencia_desde IS NOT NULL;

CREATE INDEX IF NOT EXISTS productos_fecha_vigencia_hasta_idx ON public.productos(fecha_vigencia_hasta)
WHERE fecha_vigencia_hasta IS NOT NULL;

-- Comentarios de documentación
COMMENT ON COLUMN public.productos.descuento_porcentual IS 'Porcentaje de descuento aplicado al producto (0-100). Si es 0, no hay descuento.';
COMMENT ON COLUMN public.productos.precio_oferta IS 'Precio especial de oferta. Si está presente, se usa en lugar del precio normal durante la vigencia.';
COMMENT ON COLUMN public.productos.fecha_vigencia_desde IS 'Fecha y hora desde cuando el descuento/oferta es válido. NULL significa sin límite de inicio.';
COMMENT ON COLUMN public.productos.fecha_vigencia_hasta IS 'Fecha y hora hasta cuando el descuento/oferta es válido. NULL significa sin límite de fin.';
