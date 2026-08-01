# rig.py — PROVA DE MESH DEFORM no Blender headless.
#
# A PERGUNTA QUE ESTE TESTE RESPONDE: o nosso rig gira cada peça como um retângulo rígido, e por
# isso a junta é uma emenda escondida por sobreposição. Aqui cada peça vira uma MALHA subdividida
# presa a ossos por PESO, então o cotovelo ENTORTA a arte em vez de rodar um bloco. É o que Spine,
# Moho e Live2D fazem, e é o teto de qualidade de cutout 2D.
#
# Roda assim (nunca aberto na interface):
#   blender --background --python rig.py -- <dir-das-pecas> <boneco.json> <mov.json> <saida-dir>
#
# Entrada: as MESMAS peças e os MESMOS ângulos do rig de casa, para a comparação ser honesta —
# o que muda entre um e outro é só a deformação.
import bpy, json, sys, os, math
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
PECAS_DIR, BONECO_JSON, MOV_JSON, OUT_DIR = argv[0], argv[1], argv[2], argv[3]

with open(BONECO_JSON) as f: BON = json.load(f)
with open(MOV_JSON) as f: MOV = json.load(f)

# ---------------------------------------------------------------- cena limpa
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
# o nome do motor mudou entre versões (EEVEE -> BLENDER_EEVEE_NEXT); pergunta ao enum em vez de chutar
_motores = scene.render.bl_rna.properties['engine'].enum_items.keys()
scene.render.engine = next((e for e in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE', 'BLENDER_WORKBENCH') if e in _motores), _motores[0])
scene.render.film_transparent = True
# arte chapada com emission não precisa de amostragem: 1 sample corta o render de minutos pra
# segundos e não muda um pixel
try: scene.eevee.taa_render_samples = 1
except AttributeError: pass
scene.render.resolution_x = MOV.get('w', 480)
scene.render.resolution_y = MOV.get('h', 620)
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.frame_start = 1
scene.frame_end = len(MOV['frames'])

# Câmera ORTOGRÁFICA de frente: em 2D não pode haver perspectiva, senão a peça mais longe encolhe e
# a linha do chão do projeto deixa de valer.
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
# ortho_scale vale para a MAIOR dimensão do quadro. Num formato retrato isso é a ALTURA, e passar a
# largura aqui enquadra 480 de altura num canvas de 620: a cabeça fica fora do quadro.
cam_data.ortho_scale = max(MOV.get('w', 480), MOV.get('h', 620))
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
cam.location = (0, -10, 0)
cam.rotation_euler = (math.pi / 2, 0, 0)
scene.camera = cam

# ---------------------------------------------------------------- armature
# Os ossos ficam exatamente onde as juntas do nosso `_boneco.json` estão: mesma hierarquia, mesmos
# comprimentos. Assim a comparação isola a deformação.
bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
arm_obj = bpy.context.object
arm = arm_obj.data
arm.edit_bones.remove(arm.edit_bones[0])

def add_bone(name, head, tail, parent=None):
    b = arm.edit_bones.new(name)
    b.head = Vector((head[0], 0, head[1]))
    b.tail = Vector((tail[0], 0, tail[1]))
    if parent:
        b.parent = arm.edit_bones[parent]
        b.use_connect = False
    return b

for b in MOV['ossos']:
    add_bone(b['id'], b['head'], b['tail'], b.get('pai'))
bpy.ops.object.mode_set(mode='OBJECT')

# ---------------------------------------------------------------- peças como malha
# SUBDIVIDIR é o ponto todo: um plano de 4 vértices só pode ser transladado e rodado. Com uma grade
# densa, os vértices perto da junta recebem peso dos DOIS ossos e a arte se curva entre eles.
def plano_da_peca(pid, info):
    img = bpy.data.images.load(os.path.join(PECAS_DIR, pid + '.png'))
    # o Y afasta a peça da câmera: planos coplanares brigam pelo mesmo pixel (z-fighting) e a ordem
    # de desenho vira sorteio. É o mesmo z-order do nosso motor, virado profundidade.
    bpy.ops.mesh.primitive_plane_add(size=1, location=(info['x'], info['z'], info['y']))
    ob = bpy.context.object
    ob.name = pid
    # ESCALA ANTES DA ROTAÇÃO. O plano nasce deitado no XY, então a altura dele é o Y local; girar
    # primeiro e escalar (w,1,h) depois escala um eixo que não tem geometria, e a peça vira uma
    # linha de 1 unidade de altura. Foi exatamente o que apareceu no primeiro render.
    # location=False EXPLÍCITO: o padrão de transform_apply é aplicar TAMBÉM a posição, ou seja,
    # zerar ob.location e assar a translação na malha. Chamar `transform_apply(scale=True)` parece
    # aplicar só a escala e na verdade empilha todas as peças na origem — foi por isso que o boneco
    # saiu amassado num monte só, com os membros dentro do tronco.
    ob.scale = (info['w'], info['h'], 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.subdivide(number_cuts=MOV.get('cortes', 10))
    bpy.ops.object.mode_set(mode='OBJECT')

    mat = bpy.data.materials.new(pid)
    mat.use_nodes = True
    mat.blend_method = 'BLEND'
    nt = mat.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.interpolation = 'Closest'
    emi = nt.nodes.new('ShaderNodeEmission')
    tra = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(tex.outputs['Color'], emi.inputs['Color'])
    nt.links.new(tex.outputs['Alpha'], mix.inputs['Fac'])
    nt.links.new(tra.outputs['BSDF'], mix.inputs[1])
    nt.links.new(emi.outputs['Emission'], mix.inputs[2])
    nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    ob.data.materials.append(mat)
    return ob

pecas_obj = []
for pid, info in MOV['pecas'].items():
    ob = plano_da_peca(pid, info)
    print('PECA', pid, 'loc', tuple(round(v, 1) for v in ob.location), 'dim', tuple(round(v, 1) for v in ob.dimensions))
    pecas_obj.append(ob)

# --sem-rig: renderiza só as peças paradas, sem armature. É o teste que separa "o boneco está montado
# no lugar certo" de "o rig está deformando errado" — sem ele os dois erros se confundem.
SEM_RIG = '--sem-rig' in argv

# ---------------------------------------------------------------- pesos, escritos à mão
# `ARMATURE_AUTO` (pesos por proximidade) NÃO serve para cutout: as peças se sobrepõem, então cada
# malha acaba puxada por ossos que não são dela — o tronco esticado pelas pernas, a cabeça colapsada.
# Aqui cada peça pertence ao SEU osso, e só uma faixa junto da junta mistura com o osso do pai. É
# essa faixa que cria a curva: em vez de a peça girar inteira como um bloco, ela se DOBRA perto da
# articulação, que é a diferença entre este teste e o nosso motor.
FAIXA = MOV.get('faixa', 0.28)   # quanto da peça, a partir da junta, se dobra
MISTURA = MOV.get('mistura', 0.5)  # quanto o pai manda bem em cima da junta

for ob in ([] if SEM_RIG else pecas_obj):
    info = MOV['pecas'][ob.name]
    pai = info.get('pai')
    mod = ob.modifiers.new('arm', 'ARMATURE')
    mod.object = arm_obj
    # ENVELOPES DESLIGADOS. Vêm ativos por padrão e puxam o vértice por PROXIMIDADE do osso,
    # atropelando os pesos escritos acima. Num boneco 2D todos os ossos estão a poucos pixels uns
    # dos outros, então cada peça era sugada por metade do esqueleto: o resultado foi o corpo
    # inteiro amassado dentro do tronco e a cabeça sumindo.
    mod.use_bone_envelopes = False
    mod.use_vertex_groups = True
    ob.parent = arm_obj
    g_meu = ob.vertex_groups.new(name=ob.name)
    g_pai = ob.vertex_groups.new(name=pai) if pai else None
    h = info['h']
    topo = info.get('junta_no_topo', True)
    for v in ob.data.vertices:
        # distância da junta, de 0 (encostado no pai) a 1 (ponta livre)
        d = (h / 2 - v.co.z) / h if topo else (v.co.z + h / 2) / h
        w_pai = max(0.0, 1.0 - d / FAIXA) * MISTURA if g_pai else 0.0
        g_meu.add([v.index], 1.0 - w_pai, 'REPLACE')
        if g_pai and w_pai > 0: g_pai.add([v.index], w_pai, 'REPLACE')

# ---------------------------------------------------------------- animação
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.mode_set(mode='POSE')
for i, frame in enumerate(MOV['frames']):
    scene.frame_set(i + 1)
    for bid, graus in frame.items():
        pb = arm_obj.pose.bones.get(bid)
        if not pb: continue
        pb.rotation_mode = 'XYZ'
        # NO ESPAÇO DO OSSO, Y É O EIXO DO PRÓPRIO OSSO: girar em Y é TORCER, o que num boneco 2D
        # não move um pixel. Quem gira no plano da tela é o Z local (o osso aponta ao longo de -Z
        # global, então o Z local dele cai sobre o Y global, que é a profundidade da câmera).
        pb.rotation_euler = (0, 0, math.radians(graus))
        pb.keyframe_insert('rotation_euler')
bpy.ops.object.mode_set(mode='OBJECT')

# ---------------------------------------------------------------- render
os.makedirs(OUT_DIR, exist_ok=True)
scene.render.filepath = os.path.join(OUT_DIR, 'f')
bpy.ops.render.render(animation=True)
print('BLENDER OK ->', OUT_DIR)
