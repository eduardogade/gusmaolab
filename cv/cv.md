# NOTAS_DE_GERACAO
# Fonte factual: 0.Curriculum.docx; corte no início de 2025. Identidade: instrução do autor.
# CV.yaml anterior preservado; proposta destinada à futura substituição após revisão.
# Ignoradas as alegações de Professional_Engagements; ambiente técnico virou inventário a confirmar.
# Datas impossíveis, vínculos atuais, métricas e divergências exigem revisão.
# Mantidas consultorias industriais da fonte principal; demais entradas industriais são stubs.
# Nenhum documento de entrada foi alterado. Sem verificação factual externa.
# Campos modelo_sem_vinculos são redações reutilizáveis, não novos fatos.

# Controle da versão e hierarquia documental. Datas históricas não implicam vínculo atual.
metadados:
  versao: 0.1.0
  data_atualizacao: '2026-11-12'
  autor: Eduardo Gade Gusmão
  idioma: pt-BR
  fonte_de_verdade: true
  situacao: Proposta para revisão do autor
  arquivo_destino: CV.yaml
  arquivo_desta_passada: CV.proposta.yaml
  corte_factual: '2026-11-01'
  verificacao: Transcrição e conciliação documental; sem verificação externa ou confirmação de vínculos atuais.
  regras:
    - Fonte primária prevalece; documentos secundários não comprovam fatos adicionais.
    - Datas ISO são textos; datas impossíveis e estados atuais recebem marcadores.
    - Listas vazias significam ausência de registros confirmados nesta passada, não inexistência.
    - Variantes sem vínculos são modelos de redação, não substitutos de referências bibliográficas.
    - Valores de projetos não equivalem a recursos pessoais captados; não somar moedas ou bolsas declinadas.
  fontes:
    primaria: 0.Curriculum.docx
    anterior: CV.yaml
    redacao:
      - 1_Cover_Letter.docx
      - 8_Research_Statement.docx
      - 9_Teaching_Statement.docx
      - 10_EDI_Statement.docx
      - 11_Service_and_Leadership_Statement.docx
    cobertura_sem_comprovacao:
      - 2_Curriculum.docx
      - 3_List_of_Publications.docx
      - 4_Grants_and_Funding.docx
      - 5_Awards_and_Honors.docx
      - 6_Teaching_Experience.docx
      - 7_Mentorship.docx
    referencias: 16_Contact_References.docx

# Posicionamento fornecido pelo autor; qualificações documentais ficam em formação.
identidade_profissional:
  nome: Eduardo Gade Gusmão
  nome_exterior: Eduardo Gade Gusmao
  titulo_profissional: Biólogo Computacional
  experiencia_declarada: 12+ anos
  fonte_da_identidade: Instrução explícita do autor nesta solicitação; identidade profissional, não graduação em
    Biologia.
  resumo: >-
    Biólogo Computacional com 12+ anos de experiência em bioinformática multiômica, informática em saúde e P&D em
    descoberta de fármacos e terapias. Especialista em desenvolvimento de métodos com machine learning e deep learning
    aplicados à bioinformática, pesquisador de biotecnologia multiômica e cientista, analista e engenheiro de dados
    para biologia computacional. Integra modelagem estatística, regulação gênica e arquitetura da cromatina ao estudo
    de mecanismos biológicos e à formulação de hipóteses translacionais.
  areas_de_especialidade:
    - Bioinformática multiômica
    - Informática em saúde
    - P&D em descoberta de fármacos e terapias
    - Desenvolvimento de métodos com machine learning e deep learning
    - Biotecnologia multiômica
    - Ciência, análise e engenharia de dados biológicos
    - Epigenômica, cromatina e regulação gênica
    - Senescência celular e envelhecimento
  palavras_chave:
    - biologia computacional
    - multiômica
    - bioinformatics
    - health informatics
    - drug discovery
    - machine learning
    - deep learning
    - Hi-C
    - DNase-seq
    - biomarcadores
  idiomas:
    - idioma: Português
      proficiencia: Nativo
    - idioma: Inglês
      proficiencia: Fluente C1/C2
    - idioma: Alemão
      proficiencia: A2
    - idioma: Espanhol
      proficiencia: B1

# Contatos históricos ou candidatos são identificados; não houve consulta externa.
contato:
  email: eduardogade@gmail.com
  fonte_email: CV.yaml
  telefone: +55 81 9 81052040
  orcid: 0000-0001-7461-1443
  lattes: http://lattes.cnpq.br/7258504396971325
  linkedin: https://www.linkedin.com/in/eduardogade/
  github: https://github.com/eduardogade
  google_scholar: https://scholar.google.com.br/citations?user=erHz7L8AAAAJ&hl=en
  site: https://www.gusmaolab.org
  researchgate: https://www.researchgate.net/profile/Eduardo-Gusmao
  localizacao:
    cidade: Recife
    pais: Brasil
  modelo_sem_vinculos: Eduardo Gade Gusmão | Biólogo Computacional | Recife, Brasil | eduardogade@gmail.com

# Formação segundo a fonte primária; supervisores não foram inferidos de outras seções.
formacao_academica:
  - id: formacao_1
    grau: 'Doutorado (Dr. rer. Nat.) em Ciências da Natureza (Área: Bioinformática)'
    instituicao_e_local: RWTH Aachen University – Aachen, Alemanha
    supervisao: Prof. Dr. Thomas Berlage & Prof. Dr. Ivan G. Costa
    periodo:
      inicio: '2012-11-01'
      fim: '2016-12-15'
    titulo_trabalho: Computational footprinting methods for next-generation sequencing experiments
    fonte: https://publications.rwth-aachen.de/record/681125
    modelo_sem_vinculos: 'Doutorado (Dr. rer. Nat.) em Ciências da Natureza (Área: Bioinformática) em RWTH Aachen University,
      Aachen, Alemanha, sob orientação de Prof. Dr. Thomas Berlage & Prof. Dr. Ivan G. Costa.'
  - id: formacao_2
    grau: Mestrado em Ciência da Computação
    instituicao_e_local: Universidade Federal de Pernambuco – Recife, Pernambuco, Brasil
    supervisao: Prof. Dr. Ivan G. Costa & Prof. Dr. Marcílio C. P. de Souto
    periodo:
      inicio: '2011-03-01'
      fim: '2012-10-31'
    titulo_trabalho: Identificação de sítios de ligação de fatores de transcrição com a integração de dados epigenéticos
    fonte: https://biblioteca.ufpe.br/acervo/323300/reserva
    modelo_sem_vinculos: 'Mestrado em Ciência da Computação (Área: Inteligência Artificial) em Universidade Federal de Pernambuco,
      Recife, Brasil, sob orientação de Prof. Dr. Ivan G. Costa & Prof. Dr. Marcílio C. P. de Souto.'
  - id: formacao_3
    grau: Bacharelado em Ciência da Computação
    instituicao_e_local: Universidade Federal de Pernambuco – Recife, Pernambuco, Brasil
    supervisao: Prof. Dr. Katia S. Guimarães
    periodo:
      inicio: '2006-08-01'
      fim: '2011-02-21'
    titulo_trabalho: Estudo de métodos para identificar interações entre SNPs
    fonte: N/A
    modelo_sem_vinculos: 'Bacharelado em Ciência da Computação em Universidade Federal de Pernambuco, Recife, Brasil,
      sob orientação de Prof. Dr. Katia S. Guimarães.'

# XXX AQUI

# Cargos históricos preservados. STUB — preencher indústria em passes futuros.
experiencia_profissional:
  academica_e_pesquisa:
    - id: exp_1
      cargo: Bioinformata (Bolsista)
      instituicao_e_local: Instituto Aggeu Magalhães, Fundação Oswaldo Cruz – Recife, Brasil
      departamento_e_regime: Departamento de Imunologia e Projeto Genoma SUS
      periodo:
        inicio: '2023-07-01'
        fim: '{{EXP_1_FIM}}'
      responsabilidades: '{{RESPONSABILIDADES_EXP_1}}'
      tecnologias: '{{TECNOLOGIAS_EXP_1}}'
      fonte: 0.Curriculum.docx — Atividades Profissionais
      modelo_sem_vinculos: 'Bioinformata (Bolsista) em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}. Contribuição
        específica: {{RESPONSABILIDADES_EXP_1}}.'
    - id: exp_2
      cargo: Professor Afiliado
      instituicao_e_local: Universidade Técnica de Munique – Freising, Alemanha
      departamento_e_regime: Escola de Ciências da Vida,
      periodo:
        inicio: '2024-01-01'
        fim: '{{EXP_2_FIM}}'
      responsabilidades: '{{RESPONSABILIDADES_EXP_2}}'
      tecnologias: '{{TECNOLOGIAS_EXP_2}}'
      fonte: 0.Curriculum.docx — Atividades Profissionais
      modelo_sem_vinculos: 'Professor Afiliado em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}. Contribuição
        específica: {{RESPONSABILIDADES_EXP_2}}.'
    - id: exp_3
      cargo: Professor Substituto
      instituicao_e_local: Universidade Federal de Pernambuco – Recife, Pernambuco, Brasil
      departamento_e_regime: Centro de Informática
      periodo:
        inicio: '2024-04-15'
        fim: '2024-12-31'
      responsabilidades: '{{RESPONSABILIDADES_EXP_3}}'
      tecnologias: '{{TECNOLOGIAS_EXP_3}}'
      fonte: 0.Curriculum.docx — Atividades Profissionais
      modelo_sem_vinculos: 'Professor Substituto em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}. Contribuição
        específica: {{RESPONSABILIDADES_EXP_3}}.'
    - id: exp_4
      cargo: Pesquisador Associado de Pós-Doutorado
      instituicao_e_local: Universidade de Turku – Turku, Finlândia
      departamento_e_regime: Biocity – Turku Bioscience
      periodo:
        inicio: '2023-01-04'
        fim: '2024-01-11'
      responsabilidades: '{{RESPONSABILIDADES_EXP_4}}'
      tecnologias: '{{TECNOLOGIAS_EXP_4}}'
      fonte: 0.Curriculum.docx — Atividades Profissionais
      modelo_sem_vinculos: 'Pesquisador Associado de Pós-Doutorado em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}},
        {{PAIS}}. Contribuição específica: {{RESPONSABILIDADES_EXP_4}}.'
    - id: exp_6
      cargo: Pesquisador Associado de Pós-Doutorado
      instituicao_e_local: Georg-August-Universität Göttingen – Göttingen, Alemanha
      departamento_e_regime: Institut für Pathologie – Universitätsmedizin Göttingen
      periodo:
        inicio: '2019-04-01'
        fim: '2022-12-31'
      responsabilidades: '{{RESPONSABILIDADES_EXP_6}}'
      tecnologias: '{{TECNOLOGIAS_EXP_6}}'
      fonte: 0.Curriculum.docx — Atividades Profissionais
      modelo_sem_vinculos: 'Pesquisador Associado de Pós-Doutorado em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}},
        {{PAIS}}. Contribuição específica: {{RESPONSABILIDADES_EXP_6}}.'
    - id: exp_8
      cargo: Pesquisador Associado de Pós-Doutorado
      instituicao_e_local: University of Cologne – Köln, Alemanha
      departamento_e_regime: Center for Molecular Medicine Cologne
      periodo:
        inicio: '2018-02-01'
        fim: '2019-03-31'
      responsabilidades: '{{RESPONSABILIDADES_EXP_8}}'
      tecnologias: '{{TECNOLOGIAS_EXP_8}}'
      fonte: 0.Curriculum.docx — Atividades Profissionais
      modelo_sem_vinculos: 'Pesquisador Associado de Pós-Doutorado em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}},
        {{PAIS}}. Contribuição específica: {{RESPONSABILIDADES_EXP_8}}.'
    - id: exp_9
      cargo: Pesquisador Associado de Pós-Doutorado
      instituicao_e_local: Dana-Farber Cancer Institute, Harvard School of Public Health – Boston, MA, E.U.A
      departamento_e_regime: Department of Bioinformatics and Computational Biology
      periodo:
        inicio: '2017-01-01'
        fim: '2018-01-31'
      responsabilidades: '{{RESPONSABILIDADES_EXP_9}}'
      tecnologias: '{{TECNOLOGIAS_EXP_9}}'
      fonte: 0.Curriculum.docx — Atividades Profissionais
      modelo_sem_vinculos: 'Pesquisador Associado de Pós-Doutorado em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}},
        {{PAIS}}. Contribuição específica: {{RESPONSABILIDADES_EXP_9}}.'
    - id: exp_10
      cargo: Pesquisador Visitante
      instituicao_e_local: Dana-Farber Cancer Institute, Harvard School of Public Health – Boston, MA, E.U.A
      departamento_e_regime: Department of Bioinformatics and Computational Biology
      periodo:
        inicio: '2016-09-01'
        fim: '2016-12-31'
      responsabilidades: '{{RESPONSABILIDADES_EXP_10}}'
      tecnologias: '{{TECNOLOGIAS_EXP_10}}'
      fonte: 0.Curriculum.docx — Atividades Profissionais
      modelo_sem_vinculos: 'Pesquisador Visitante em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}. Contribuição
        específica: {{RESPONSABILIDADES_EXP_10}}.'
    - id: exp_11
      cargo: Assistente de Pesquisa
      instituicao_e_local: RWTH Aachen University Medical School – Aachen, Alemanha
      departamento_e_regime: Helmholtz Institute for Biomedical Engineering
      periodo:
        inicio: '2012-11-01'
        fim: '2016-08-31'
      responsabilidades: '{{RESPONSABILIDADES_EXP_11}}'
      tecnologias: '{{TECNOLOGIAS_EXP_11}}'
      fonte: 0.Curriculum.docx — Atividades Profissionais
      modelo_sem_vinculos: 'Assistente de Pesquisa em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}. Contribuição
        específica: {{RESPONSABILIDADES_EXP_11}}.'
    - id: exp_12
      cargo: Assistente de Pesquisa (como aluno de mestrado)
      instituicao_e_local: Universidade Federal de Pernambuco – Recife, Pernambuco, Brasil
      departamento_e_regime: Centro de Informática
      periodo:
        inicio: '2011-01-01'
        fim: '2012-10-31'
      responsabilidades: '{{RESPONSABILIDADES_EXP_12}}'
      tecnologias: '{{TECNOLOGIAS_EXP_12}}'
      fonte: 0.Curriculum.docx — Atividades Profissionais
      modelo_sem_vinculos: 'Assistente de Pesquisa (como aluno de mestrado) em {{INSTITUICAO}}, {{LABORATORIO}},
        {{CIDADE}}, {{PAIS}}. Contribuição específica: {{RESPONSABILIDADES_EXP_12}}.'
    - id: exp_13
      cargo: 'Estágio: Desenvolvedor Web'
      instituicao_e_local: Universidade Federal de Pernambuco – Recife, Pernambuco, Brasil
      departamento_e_regime: Núcleo de Tecnologia da Informação (NTI) – SIG@
      periodo:
        inicio: '2010-01-01'
        fim: '2011-07-31'
      responsabilidades: '{{RESPONSABILIDADES_EXP_13}}'
      tecnologias: '{{TECNOLOGIAS_EXP_13}}'
      fonte: 0.Curriculum.docx — Atividades Profissionais
      modelo_sem_vinculos: 'Estágio: Desenvolvedor Web em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
        Contribuição específica: {{RESPONSABILIDADES_EXP_13}}.'
    - id: exp_14
      cargo: Assistente de Pesquisa (como aluno de graduação)
      instituicao_e_local: Universidade Federal de Pernambuco – Recife, Pernambuco, Brasil
      departamento_e_regime: Centro de Informática
      periodo:
        inicio: '2009-01-01'
        fim: '2010-12-31'
      responsabilidades: '{{RESPONSABILIDADES_EXP_14}}'
      tecnologias: '{{TECNOLOGIAS_EXP_14}}'
      fonte: 0.Curriculum.docx — Atividades Profissionais
      modelo_sem_vinculos: 'Assistente de Pesquisa (como aluno de graduação) em {{INSTITUICAO}}, {{LABORATORIO}},
        {{CIDADE}}, {{PAIS}}. Contribuição específica: {{RESPONSABILIDADES_EXP_14}}.'
  consultoria_industrial_documentada:
    - id: exp_5
      cargo: Membro Sênior do Comitê de Consultoria
      instituicao_e_local: BioNTech SE – Mainz, Alemanha
      departamento_e_regime: 'Institut für Infektionskrankheiten – Regime híbrido: 10 semanas presenciais ao ano
        contratual'
      periodo:
        inicio: '2022-08-01'
        fim: '{{EXP_5_FIM}}'
      responsabilidades: '{{RESPONSABILIDADES_EXP_5}}'
      tecnologias: '{{TECNOLOGIAS_EXP_5}}'
      fonte: 0.Curriculum.docx — Atividades Profissionais
      modelo_sem_vinculos: 'Membro Sênior do Comitê de Consultoria em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}},
        {{PAIS}}. Contribuição específica: {{RESPONSABILIDADES_EXP_5}}.'
    - id: exp_7
      cargo: Membro Júnior do Comitê de Consultoria
      instituicao_e_local: Bayer AG – Wuppertal, Alemanha
      departamento_e_regime: 'Bayer Forschungszentrum – Regime híbrido: Com 1 mês presencial ao ano contratual'
      periodo:
        inicio: '2018-08-06'
        fim: '2022-07-29'
      responsabilidades: '{{RESPONSABILIDADES_EXP_7}}'
      tecnologias: '{{TECNOLOGIAS_EXP_7}}'
      fonte: 0.Curriculum.docx — Atividades Profissionais
      modelo_sem_vinculos: 'Membro Júnior do Comitê de Consultoria em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}},
        {{PAIS}}. Contribuição específica: {{RESPONSABILIDADES_EXP_7}}.'
  industria:
    - situacao: Rascunho; não contabilizar como vínculo
      cargo: '{{CARGO_INDUSTRIA}}'
      empresa: '{{INSTITUICAO}}'
      periodo:
        inicio: '{{INICIO_INDUSTRIA}}'
        fim: '{{FIM_INDUSTRIA}}'
      responsabilidades:
        - '{{RESPONSABILIDADES_INDUSTRIA}}'
      resultados:
        - '{{RESULTADOS_INDUSTRIA_COM_EVIDENCIA}}'
      tecnologias:
        - '{{TECNOLOGIAS_INDUSTRIA}}'
      modelo_sem_vinculos: 'Atuação como {{CARGO_INDUSTRIA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}, em {{LABORATORIO}};
        contribuição em biologia computacional: {{RESPONSABILIDADES_INDUSTRIA}}.'

# Inventário primário completo; identificadores pendentes não são DOIs inventados.
publicacoes:
  criterio: Somente registros da seção 4 da fonte principal; autoria e ano preservados. Não inclui artigos de consórcios
    omitidos pelo autor.
  artigos:
    - id: 4.1.1
      autores: >-
        Merz, S., Senée, V., Philippi, A., Oswald, F., Shaigan, M., Führer, M., Drewes, C., Allgöwer, C., Degavre,
        A., Öllinger, R., Heni, M., Boland, A., Deleuze, J.-F., Birkhofer, F., Gusmao, E.G., Wagner, M., Hohwieler,
        M., Breunig, M., Rad, R., Siebert, R., Messerer, D., Costa, I.G., Alvarez, F., Julier, C., Heller, S., Kleger,
        A.
      titulo: A ONECUT1 regulatory, non-coding region in pancreatic development and diabetes
      veiculo_e_detalhes: 'Cell Reports, 43(11): 114853, 2024.'
      ano: 2024
      doi_ou_url: '{{IDENTIFICADOR_4_1_1}}'
    - id: 4.1.2
      autores: Zhijian, L., Kuo, C.-C., Ticconi, F., Shaigan, M., Gehrmann, J., Gusmao, E.G., Allhoff, M., Manolov,
        M., Zenke, M., Costa, I.G.
      titulo: 'RGT: a toolbox for the integrative analysis of high throughput regulatory genomics data'
      veiculo_e_detalhes: 'BMC Bioinformatics, 24(2): 79, 2023.'
      ano: 2023
      doi_ou_url: 10.1186/s12859-023-05184-5
      fonte_identificador: 8_Research_Statement.docx; associação documental por título/autoria, sem validação externa
    - id: 4.1.3
      autores: Acharya, A., Nemade, H., Papadopoulos, S., Hescheler, J., Neumaier, F., Schneider T., Prasad, K.R.,
        Khan, K., Hemmersbach, R., Gusmao, E.G., Mizi, A., Papantonis, A., Sachinidis, A.
      titulo: Microgravity-induced stress mechanisms in human stem cell-derived cardiomyocytes
      veiculo_e_detalhes: 'iScience, 25(7): 104577, 2022.'
      ano: 2022
      doi_ou_url: 10.1016/j.isci.2022.104577
      fonte_identificador: 8_Research_Statement.docx; associação documental por título/autoria, sem validação externa
    - id: 4.1.4
      autores: >-
        Zhang, S., Übelmesser, N., Josipovic, N., Forte, G., Slotman, J.A., Chiang, M., Gothe, H., Gusmao, E.G.,
        Becker, C., Altmüller, J., Houtsmuller, A.B., Roukos, V., Wendt, K.S., Marenduzzo, D., Papantonis, A.
      titulo: RNA polymerase II is required for spatial chromatin reorganization following exit from mitosis
      veiculo_e_detalhes: 'Science Advances, 7(43): eabg8205, 2021.'
      ano: 2021
      doi_ou_url: 10.1126/sciadv.abg8205
      fonte_identificador: 8_Research_Statement.docx; associação documental por título/autoria, sem validação externa
    - id: 4.1.5
      autores: >-
        Zampetidis, C.P., Galanos, P., Angelopoulou, A., Zhu, Y., Polyzou, A., Karamitros, T., Kotsinas, A., Lagopati,
        N., Mourkioti, I., Mirzazadeh, R., Polyzos, A., Garnerone, S., Mizi, A., Gusmao, E.G., Sofiadis, K., Gál,
        Z., Larsen, D.H., Pefani, D.-E., Demaria, M., Tsirigos, A., Crosetto, N., Maya-Mendoza, A., Papaspyropoulos,
        A., Evangelou, K., Bartek, J., Papantonis, A., Gorgoulis, V.G.
      titulo: A recurrent chromosomal inversion suffices for driving escape from oncogene-induced senescence via
        subTAD reorganization
      veiculo_e_detalhes: 'Molecular Cell, 81(23): 4907-4923, 2021.'
      ano: 2021
      doi_ou_url: 10.1016/j.molcel.2021.10.017
      fonte_identificador: 8_Research_Statement.docx; associação documental por título/autoria, sem validação externa
    - id: 4.1.6
      autores: >-
        Sofiadis, K., Josipovic, N., Nikolic, M., Kargapolova, Y., Übelmesser, N., Varamogianni, I., Zirkel, A.,
        Papadionysiou, I., Loughran, G., Keanes, J., Michel, A., Gusmao, E.G., Becker, C., Altmüller, J., Georgomanolis,
        T., Mizi, A., Papantonis, A.
      titulo: HMGB1 coordinates SASP-related chromatin folding and RNA homeostasis on the path to senescence
      veiculo_e_detalhes: 'Molecular Systems Biology, 17: e9760., 2021.'
      ano: 2021
      doi_ou_url: 10.15252/msb.20209760
      fonte_identificador: 8_Research_Statement.docx; associação documental por título/autoria, sem validação externa
    - id: 4.1.7
      autores: >-
        Kargapolova, Y., Rehimi, R., Kayserili, H., Brühl, J., Zirkel, A., Li, Y., Yigit, G., Hoischen, A., Frank,
        S., Russ, N., Trautwein, J., Laugsch, M., Gusmao, E.G., Josipovic, N., Altmüller, J., Nürnberg, P., Längst,
        G., Kaiser, F.J., Watrin, E., Brunner, H., Rada-Iglesias, A., Kurian, L., Wollnik, B., Bouazoune, K., Papantonis,
        A.
      titulo: Overarching control of autophagy and DNA damage response by CHD6 revealed by modeling a rare human
        pathology
      veiculo_e_detalhes: 'Nature Communications, 12: 3014, 2021.'
      ano: 2021
      doi_ou_url: '{{IDENTIFICADOR_4_1_7}}'
    - id: 4.1.8
      autores: Casa, V.*, Gines, M.M.*, Gusmao, E.G.*, Slotman, J.A., Zirkel, A., Josipovic, A., Oole, E., van Ijcken,
        W.F.J., Houtsmuller, A.B., Papantonis, A., Wendt, K.
      titulo: Redundant and specific roles of cohesin STAG subunits in chromatin looping and transcription control
      veiculo_e_detalhes: 'Genome Research, 30(4): 515-527, 2020.'
      ano: 2020
      doi_ou_url: 10.1101/gr.253211.119
      nota_autoria: Asterisco indica co-primeira autoria na fonte; preservar atribuição individual.
      fonte_identificador: 8_Research_Statement.docx; associação documental por título/autoria, sem validação externa
    - id: 4.1.9
      autores: Mizi, A.*, Gusmao, E.G.*, Papantonis, A.
      titulo: 'iHi-C 2.0: A simple approach for mapping native spatial chromatin organization from low cell numbers'
      veiculo_e_detalhes: 'Methods. 170: 33-37, 2020.'
      ano: 2020
      doi_ou_url: '{{IDENTIFICADOR_4_1_9}}'
      nota_autoria: Asterisco indica co-primeira autoria na fonte; preservar atribuição individual.
    - id: 4.1.10
      autores: >-
        Gothe, H.J.*, Bouwman B.A.M.*, Gusmao, E.G.*, Piccino, R., Petrosino, G., Sayols, S., Drechsel, O., Minneker,
        V., Josipovic, N., Mizi, A., Nielsen, C., Wagner, E.-M., Takeda, S., H., Hudson, D.F., Kindler, T. Baranello,
        L., Papantonis, A., Crosetto N., Roukos, V.
      titulo: Spatial chromosome folding and active transcription drive DNA fragility and formation of oncogenic
        MLL translocations
      veiculo_e_detalhes: 'Molecular Cell. 75(2): 267-283, 2019.'
      ano: 2019
      doi_ou_url: 10.1016/j.molcel.2019.05.015
      nota_autoria: Asterisco indica co-primeira autoria na fonte; preservar atribuição individual.
      fonte_identificador: 8_Research_Statement.docx; associação documental por título/autoria, sem validação externa
    - id: 4.1.11
      autores: >-
        Zirkel, A., Nikolicć, M., Sofiadis, K., Mallm, J.P., Brackley, C.A., Gothe, H., Drechsel, O., Becker, C.,
        Altmüller, J., Josipovic, N., Georgomanolis, T., Brant, L., Franzen, J., Koker, M., Gusmao, E.G., Costa,
        I.G., Ullrich R.T., Wagner, W., Roukos, V., Nürnberg, P., Marenduzzo, D., Rippe, K., Papantonis, A.
      titulo: HMGB2 loss upon senescence entry disrupts genomic organization and induces CTCF clustering across
        cell types
      veiculo_e_detalhes: 'Molecular Cell, 70(4): 730-744, 2018.'
      ano: 2018
      doi_ou_url: 10.1016/j.molcel.2018.03.030
      fonte_identificador: 8_Research_Statement.docx; associação documental por título/autoria, sem validação externa
    - id: 4.1.12
      autores: >-
        Axelsson, A.S., Mahdi, T., Nenonen, H.A., Singh, T., Hänzelmann S., Wendt, A., Bagge, A., Reinbothe, T.M.,
        Millstein, J., Yang, X., Zhang, B., Gusmao, E.G., Shu, L., Szabat, M., Tang, Y., Wang, J., Salö, S., Eliasson,
        L., Artner, I., Fex, M., Johnson, J.D., Wollheim, C.B., Derry, J.M.J., Mecham, B., Spégel, P., Mulder, H.,
        Costa, I.G., Zhang, E., Rosengren, A.H.
      titulo: Sox5 regulates Beta-cell phenotype and is reduced in type 2 diabetes
      veiculo_e_detalhes: 'Nature Communications, 8: 15652, 2017.'
      ano: 2017
      doi_ou_url: '{{IDENTIFICADOR_4_1_12}}'
    - id: 4.1.13
      autores: Kolovos, P., Georgomanolis, T., Koeferle, A., Larkin, J.D., Brant, L., Nikolicć, M., Gusmao, E.G.,
        Zirkel, A., Knoch, T.A., Costa, I.G., van Ijcken, W.F., Cook, P.R., Grosveld, F.G., Papantonis, A.
      titulo: Binding of nuclear factor kappa B to non-canonical consensus sites reveals its multimodal role during
        the early inflammatory response
      veiculo_e_detalhes: 'Genome Research, 26(11): 1478-1489, 2016.'
      ano: 2016
      doi_ou_url: 10.1101/gr.210005.116
      fonte_identificador: 8_Research_Statement.docx; associação documental por título/autoria, sem validação externa
    - id: 4.1.14
      autores: Gusmao, E.G., Allhoff, M., Zenke, M., Costa, I.G.
      titulo: Analysis of computational footprinting methods for DNase sequencing experiments
      veiculo_e_detalhes: 'Nature Methods, 13(4): 303-309, 2016.'
      ano: 2016
      doi_ou_url: 10.1038/nmeth.3772
      fonte_identificador: 8_Research_Statement.docx; associação documental por título/autoria, sem validação externa
    - id: 4.1.15
      autores: >-
        Schemionek, M., Herrmann, O., Reher, M.M., Chatain, N., Schubert, C., Costa, I.G., Hänzelmann, S., Gusmao,
        E.G., Kintsler, S., Braunschweig, T., Hamilton, A., Helgason, G.V., Copland, M., Schwab, A., Müller-Tidow,
        C., Li, S., Holyoake, T.L., Brümmendorf, T.H., Koschmieder, S.
      titulo: Mtss1 is a critical epigenetically regulated tumor suppressor in CML
      veiculo_e_detalhes: 'Leukemia, 30(4): 823-832, 2015.'
      ano: 2015
      doi_ou_url: 10.1038/leu.2015.329
      fonte_identificador: 8_Research_Statement.docx; associação documental por título/autoria, sem validação externa
    - id: 4.1.16
      autores: Lin, Q.*, Chauvistré, H.*, Costa, I.G.*, Gusmao, E.G., Mitzka, S., Hänzelmann, S., Baying, B., Klisch,
        T., Moriggl, R., Hennuy, B., Smeets, H., Homann, K., Benes, V., Seré, K., Zenke, M.
      titulo: Epigenetic program and transcription factor circuitry of dendritic cell development
      veiculo_e_detalhes: 'Nucleic Acids Research, 43(20): 9680-9693, 2015.'
      ano: 2015
      doi_ou_url: 10.1093/nar/gkv1056
      nota_autoria: Asterisco indica co-primeira autoria na fonte; preservar atribuição individual.
      fonte_identificador: 8_Research_Statement.docx; associação documental por título/autoria, sem validação externa
    - id: 4.1.17
      autores: Hänzelmann, S.*, Beier, F.*, Gusmao, E.G.*, Koch, C.M., Hummel, S., Charapitsa, I., Joussen, S.,
        Benes, V., Brümmendorf, T.H., Reid, G., Costa, I.G., Wagner, W.
      titulo: Replicative senescence is associated with nuclear reorganization and with DNA methylation at specific
        transcription factor binding sites
      veiculo_e_detalhes: 'Clinical Epigenetics, 7(1): 19-33, 2015.'
      ano: 2015
      doi_ou_url: 10.1186/s13148-015-0057-5
      nota_autoria: Asterisco indica co-primeira autoria na fonte; preservar atribuição individual.
      fonte_identificador: 8_Research_Statement.docx; associação documental por título/autoria, sem validação externa
    - id: 4.1.18
      autores: Gusmao, E.G., Dieterich, C., Zenke, M., Costa, I.G.
      titulo: Detection of active transcription factor binding sites with the combination of DNase hypersensitivity
        and histone modifications
      veiculo_e_detalhes: 'Bioinformatics, 30(22): 3143-3151, 2014.'
      ano: 2014
      doi_ou_url: 10.1093/bioinformatics/btu519
      fonte_identificador: 8_Research_Statement.docx; associação documental por título/autoria, sem validação externa
    - id: 4.1.19
      autores: Ullius, A., Lüscher-Firzlaf, J., Costa, I.G., Walsemann, G., Forst, A.H., Gusmao, E.G., Kapelle,
        K., Kleine, H., Kremmer, E., Vervoorts, J., Lüscher, B.
      titulo: The interaction of MYC with the trithorax protein ASH2L promotes gene transcription by regulating
        H3K27 modification
      veiculo_e_detalhes: 'Nucleic Acids Research, 42(11): 6901-6920, 2014.'
      ano: 2014
      doi_ou_url: 10.1093/nar/gku312
      fonte_identificador: 8_Research_Statement.docx; associação documental por título/autoria, sem validação externa
  anais_completos:
    - id: 4.2.1
      autores: Gusmao, E.G. & de Souto, M.C.P.
      titulo: Issues on sampling negative examples for predicting prokaryotic promoters
      veiculo_e_detalhes: Proceedings of the 2014 IEEE International Joint Conference on Neural Networks (IJCNN),
        Beijing, China, 2014.
      ano: 2014
      doi_ou_url: '{{IDENTIFICADOR_4_2_1}}'
      modelo_sem_vinculos: Issues on sampling negative examples for predicting prokaryotic promoters. Apresentado/publicado
        em {{EVENTO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.2.2
      autores: Gusmao, E.G., Dieterich, C., Costa, I.G.
      titulo: Prediction of transcription factor binding sites by integrating DNase digestion and histone modification
      veiculo_e_detalhes: 'Proceedings of the 2012 Brazilian Symposium of Bioinformatics (BSB), 7409: 109-119, 2012.'
      ano: 2012
      doi_ou_url: '{{IDENTIFICADOR_4_2_2}}'
      modelo_sem_vinculos: Prediction of transcription factor binding sites by integrating DNase digestion and histone
        modification. Apresentado/publicado em {{EVENTO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.2.3
      autores: Araújo, F.R.B., Gusmao, E.G., Guimarães, K.S.
      titulo: A case-control study of non-parametric approaches for detecting SNP-SNP interactions
      veiculo_e_detalhes: Proceedings of the 30th International Conference of the Chilean Computer Science Society,
        19-27, Curico, Chile, 2011.
      ano: 2011
      doi_ou_url: '{{IDENTIFICADOR_4_2_3}}'
      modelo_sem_vinculos: A case-control study of non-parametric approaches for detecting SNP-SNP interactions.
        Apresentado/publicado em {{EVENTO}}, {{CIDADE}}, {{PAIS}}.
  resumos_em_anais:
    - id: 4.3.1
      autores: Gusmao, E.G.
      titulo: Using convolutional neural networks to process biological matrices
      veiculo_e_detalhes: Proceedings of the III CIMA - Congreso Internacional de Matemática y Aplicaciones, Ica,
        Peru, 2024.
      ano: 2024
      doi_ou_url: '{{IDENTIFICADOR_4_3_1}}'
      modelo_sem_vinculos: Using convolutional neural networks to process biological matrices. Apresentado/publicado
        em {{EVENTO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.3.2
      autores: Gusmao, E.G. & Papantonis, A.
      titulo: 'Bloom: A computational framework to reveal occult patterns on chromatin conformation experiments'
      veiculo_e_detalhes: 'Proceedings of the 2019 IMB Conference: Chromosome Territories and Nuclear Architecture,
        Mainz, Alemanha, 2019.'
      ano: 2019
      doi_ou_url: '{{IDENTIFICADOR_4_3_2}}'
      modelo_sem_vinculos: 'Bloom: A computational framework to reveal occult patterns on chromatin conformation
        experiments. Apresentado/publicado em {{EVENTO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 4.3.3
      autores: Hélène Kabbech & Gusmao E.G.
      titulo: An Integrative Deep-Learning Framework for Analyzing the Interplay between Chromatin Conformation
        and Epigenetics
      veiculo_e_detalhes: 'Proceedings of the 2019 EMBO Workshop: The Genome in Three Dimensions, Kyllini, Grécia,
        2019.'
      ano: 2019
      doi_ou_url: '{{IDENTIFICADOR_4_3_3}}'
      modelo_sem_vinculos: An Integrative Deep-Learning Framework for Analyzing the Interplay between Chromatin
        Conformation and Epigenetics. Apresentado/publicado em {{EVENTO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.3.4
      autores: Gusmao, E.G., Papantonis, A.
      titulo: Computational optimization allows exploration of native chromatin conformation
      veiculo_e_detalhes: 'Proceedings of the 2019 EMBO Workshop: The Genome in Three Dimensions, Kyllini, Grécia,
        2019.'
      ano: 2019
      doi_ou_url: '{{IDENTIFICADOR_4_3_4}}'
      modelo_sem_vinculos: Computational optimization allows exploration of native chromatin conformation. Apresentado/publicado
        em {{EVENTO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.3.5
      autores: Gothe, H., Gusmao, E.G., Bouwman, B.A.M., Piccinno, R., Puig, S.S., Drechsel, O., Petrosino, G.,
        Crosetto, N., Papantonis, A., Roukos, V.
      titulo: Spatial chromosome folding and active transcription drive DNA fragility and formation of oncogenic
        MLL translocations
      veiculo_e_detalhes: 'Proceedings of the 2019 EMBO Workshop: The Genome in Three Dimensions, Kyllini, Grécia,
        2019.'
      ano: 2019
      doi_ou_url: '{{IDENTIFICADOR_4_3_5}}'
      modelo_sem_vinculos: Spatial chromosome folding and active transcription drive DNA fragility and formation
        of oncogenic MLL translocations. Apresentado/publicado em {{EVENTO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.3.6
      autores: Gusmao, E.G., Li, Z., Costa, I.G.
      titulo: Prediction of transcription factor binding sites using computational footprinting data
      veiculo_e_detalhes: Proceedings of the 2016 RECOMB/ISCB Conference on Regulatory and Systems Genomics with
        DREAM Challenges, Phoenix, AZ, E.U.A., 2016.
      ano: 2016
      doi_ou_url: '{{IDENTIFICADOR_4_3_6}}'
      modelo_sem_vinculos: Prediction of transcription factor binding sites using computational footprinting data.
        Apresentado/publicado em {{EVENTO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.3.7
      autores: Gusmao, E.G. & Costa, I.G.
      titulo: Computational approaches to correct biases by next-generation sequencing techniques
      veiculo_e_detalhes: Otto Warburg International Summer School and Research Symposium, Berlin, Alemanha, 2015.
      ano: 2015
      doi_ou_url: '{{IDENTIFICADOR_4_3_7}}'
      modelo_sem_vinculos: Computational approaches to correct biases by next-generation sequencing techniques.
        Apresentado/publicado em {{EVENTO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.3.8
      autores: Gusmao, E.G. & Costa, I.G.
      titulo: HINT-BC – HMM-based identification of transcription factor footprints on bias-corrected DNase-seq
        data
      veiculo_e_detalhes: >-
        Proceedings of the 23rd Annual International Conference on Intelligent Systems for Molecular Biology and
        14th European Conference on Computational Biology (ISMB/ECCB 2015) & Regulatory Genomics Special Interest
        Group (RegGenSIG 2015), Dublin, Irlanda, 2015.
      ano: 2015
      doi_ou_url: '{{IDENTIFICADOR_4_3_8}}'
      modelo_sem_vinculos: HINT-BC – HMM-based identification of transcription factor footprints on bias-corrected
        DNase-seq data. Apresentado/publicado em {{EVENTO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.3.9
      autores: Gusmao, E.G. & Costa, I.G.
      titulo: Are computationally predicted footprints the result of DNase I cleavage bias?
      veiculo_e_detalhes: Proceedings of the 2014 RECOMB/ISCB Conference on Regulatory and Systems Genomics, San
        Diego, CA, E.U.A., 2014.
      ano: 2014
      doi_ou_url: '{{IDENTIFICADOR_4_3_9}}'
      modelo_sem_vinculos: Are computationally predicted footprints the result of DNase I cleavage bias?. Apresentado/publicado
        em {{EVENTO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.3.10
      autores: Gusmao, E.G. & Costa, I.G.
      titulo: Search of cell-specific transcription factor binding sites with DNase hypersensitivity and histone
        modifications
      veiculo_e_detalhes: Proceedings of the International Conference of the AB3C and Brazilian Symposium on Bioinformatics
        (X-meeting/BSB 2013), Recife, Pernambuco, Brasil, 2013.
      ano: 2013
      doi_ou_url: '{{IDENTIFICADOR_4_3_10}}'
      modelo_sem_vinculos: Search of cell-specific transcription factor binding sites with DNase hypersensitivity
        and histone modifications. Apresentado/publicado em {{EVENTO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.3.11
      autores: Gusmao, E.G. & Costa, I.G.
      titulo: Improving TFBS prediction by integrating epigenetic features
      veiculo_e_detalhes: Proceedings of the 5th Bioinformatics and Stem Cells Satellite Workshop, Köln, Alemanha,
        2013.
      ano: 2013
      doi_ou_url: '{{IDENTIFICADOR_4_3_11}}'
      modelo_sem_vinculos: Improving TFBS prediction by integrating epigenetic features. Apresentado/publicado em
        {{EVENTO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.3.12
      autores: Costa, I.G & Gusmao, E.G.
      titulo: Prediction of transcription factor binding sites by integrating DNase digestion and histone modification
      veiculo_e_detalhes: Proceedings of the 11th European Conference on Computational Biology (ECCB 2012), Basel,
        Suiça, 2012.
      ano: 2012
      doi_ou_url: '{{IDENTIFICADOR_4_3_12}}'
      modelo_sem_vinculos: Prediction of transcription factor binding sites by integrating DNase digestion and histone
        modification. Apresentado/publicado em {{EVENTO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.3.13
      autores: Rego, T.G., Araújo Filho, C.R., Gusmao, E.G., de Souto, M.C.P., Costa, I.G.
      titulo: Classification complexity in gene marker selection for cancer diagnosis
      veiculo_e_detalhes: Proceedings of the 5th International Conference of the Brazilian Association for Bioinformatics
        and Computational Biology (AB3C 2009), Angra dos Reis, Rio de Janeiro, Brasil, 2009.
      ano: 2009
      doi_ou_url: '{{IDENTIFICADOR_4_3_13}}'
      modelo_sem_vinculos: Classification complexity in gene marker selection for cancer diagnosis. Apresentado/publicado
        em {{EVENTO}}, {{CIDADE}}, {{PAIS}}.
  capitulos: []
  preprints: []
  fonte: 0.Curriculum.docx — 4.1, 4.2 e 4.3
  metricas_bibliometricas:
    situacao: Não atualizadas; não usar como métricas atuais
    valores_historicos_declarados:
      citacoes: '> 1450'
      indice_h: 18
      fator_impacto_cumulativo: '> 260'
      primeira_ou_coprimeira_autoria: 8
    data_da_consulta: '{{DATA_METRICAS}}'
    reconciliacao: '{{RECONCILIAR_METRICAS}}'

# Palestras e participações são registros distintos; não somar como eventos únicos.
apresentacoes_e_eventos:
  palestras:
    - id: 4.4.1
      data: '2024-09-18'
      descricao: “Using convolutional neural networks to process biological matrices” em III CIMA - Congreso Internacional
        de Matemática y Aplicaciones – Ica, Peru.
      modelo_sem_vinculos: Using convolutional neural networks to process biological matrices em {{INSTITUICAO}},
        {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.4.2
      data: '2019-10-31'
      descricao: '“Bloom: A computational framework to reveal occult patterns on chromatin conformation experiments”
        em 2019 IMB Conference: Chromosome Territories and Nuclear Architecture – Mainz, Alemanha.'
      modelo_sem_vinculos: 'Bloom: A computational framework to reveal occult patterns on chromatin conformation
        experiments em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 4.4.3
      data: '2016-12-09'
      descricao: “Analysis of computational footprinting methods for DNase sequencing experiments” em Day of Medical
        Research of RWTH Aachen University Medical School – Aachen, Alemanha.
      modelo_sem_vinculos: Analysis of computational footprinting methods for DNase sequencing experiments em {{INSTITUICAO}},
        {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.4.4
      data: '2016-11-09'
      descricao: “Prediction of active transcription factor binding sites using computational footprinting data”
        em RECOMB/ISCB Conference on Regulatory and Systems Genomics with DREAM Challenges – Phoenix, AZ, E.U.A.
      modelo_sem_vinculos: Prediction of active transcription factor binding sites using computational footprinting
        data em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.4.5
      data: '2015-09-09'
      descricao: “Computational approaches to correct biases generated by next-generation sequencing techniques”
        em Otto Warburg International Summer School and Research Symposium – Berlin, Alemanha.
      modelo_sem_vinculos: Computational approaches to correct biases generated by next-generation sequencing techniques
        em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.4.6
      data: '2015-07-11'
      descricao: >-
        “HINT-BC: HMM-based identification of transcription factor footprints on bias-corrected DNase-seq data”
        em International Conference on Intelligent Systems for Molecular Biology and European Conference on Computational
        Biology (ISMB/ECCB) – Dublin, Irlanda.
      modelo_sem_vinculos: 'HINT-BC: HMM-based identification of transcription factor footprints on bias-corrected
        DNase-seq data em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 4.4.7
      data: '2014-11-13'
      descricao: “Are computationally predicted footprints result of DNase I cleavage bias?” em RECOMB/ISCB Conference
        on Regulatory and Systems Genomics with DREAM Challenges – San Diego, CA, E.U.A.
      modelo_sem_vinculos: Are computationally predicted footprints result of DNase I cleavage bias? em {{INSTITUICAO}},
        {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.4.8
      data: '2013-11-04'
      descricao: >-
        “Search of cell-specific transcription factor binding sites with DNase hypersensitivity and histone modifications”
        em International Conference of the AB3C and Brazilian Symposium on Bioinformatics (X-meeting/BSB) – Recife,
        Pernambuco, Brasil.
      modelo_sem_vinculos: Search of cell-specific transcription factor binding sites with DNase hypersensitivity
        and histone modifications em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.4.9
      data: '2013-04-22'
      descricao: “Improving TFBS prediction by integrating epigenetic features” em 5th Bioinformatics and Stem Cells
        Satellite Workshop – Cologne, Alemanha.
      modelo_sem_vinculos: Improving TFBS prediction by integrating epigenetic features em {{INSTITUICAO}}, {{LABORATORIO}},
        {{CIDADE}}, {{PAIS}}.
    - id: 4.4.10
      data: '2012-08-16'
      descricao: “Prediction of transcription factor binding sites by integrating DNase digestion and histone modification”
        em Brazilian Symposium on Bioinformatics – Campo Grande, Mato Grosso do Sul, Brasil.
      modelo_sem_vinculos: Prediction of transcription factor binding sites by integrating DNase digestion and histone
        modification em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.4.11
      data: '2010-08-21'
      descricao: “Estudo de métodos para identificação de interações entre polimorfismos” em 18o Congresso de Iniciação
        Científica da UFPE – Recife, Pernambuco, Brasil.
      modelo_sem_vinculos: Estudo de métodos para identificação de interações entre polimorfismos em {{INSTITUICAO}},
        {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: 4.4.12
      data: '2010-03-14'
      descricao: “Estudo de métodos para identificar interações entre polimorfismos” em 14a Jornada de Iniciação
        Científica – Recife, Pernambuco, Brasil.
      modelo_sem_vinculos: Estudo de métodos para identificar interações entre polimorfismos em {{INSTITUICAO}},
        {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
  participacoes:
    - id: 7.5.1
      periodo:
        inicio: '2024-11-18'
        fim: '2024-11-20'
      descricao: “Simpósio de Susceptibilidade Genética Aplicada à Saúde” (Participação). Ribeirão Preto, São Paulo,
        Brasil.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.2
      periodo:
        inicio: '2024-09-16'
        fim: '2024-09-20'
      descricao: “III International Congress of Mathematics and Applications (CIMA)” (Participação e apresentação
        oral). Ica, Peru.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.3
      periodo:
        inicio: '2019-10-31'
        fim: '2019-11-01'
      descricao: '“2019 IMB Conference: Chromosome Territories and Nuclear Architecture” (Participação e apresentação
        oral). Mainz, Alemanha.'
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.4
      periodo:
        inicio: '2019-07-22'
        fim: '2019-07-26'
      descricao: “3rd International Summer School on Deep Learning (DeepLearn 2019)” (Participação). Warsaw, Polônia.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.5
      periodo:
        inicio: '2019-05-20'
        fim: '2019-05-24'
      descricao: '“2019 EMBO Workshop: The Genome in Three Dimensions” (Participação e apresentação oral). Kyllini,
        Grécia.'
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.6
      periodo:
        inicio: '2017-05-07'
        fim: '2017-05-09'
      descricao: “Genome Engineering Practical Workshop” (Participação). Cambridge, MA, E.U.A.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.7
      periodo:
        inicio: '2017-04-18'
        fim: '2017-04-18'
      descricao: “10X Genomics User Group Meeting” (Participação). Cambridge, MA, E.U.A.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.8
      periodo:
        inicio: '2017-02-06'
        fim: '2017-02-10'
      descricao: “Genomic Approaches Towards Precision Cancer Medicine Symposium” (Participação). Boston, MA, E.U.A.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.9
      periodo:
        inicio: '2016-12-12'
        fim: '2016-12-12'
      descricao: “Day of Medical Research of RWTH Aachen” (Participação e apresentação oral). Aachen, Alemanha.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.10
      periodo:
        inicio: '2016-11-06'
        fim: '2016-11-09'
      descricao: “RECOMB/ISCB Conference on Regulatory and Systems Genomics with DREAM Challenges” (Participação
        e apresentação de pôster). Phoenix, AZ, E.U.A.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.11
      periodo:
        inicio: '2016-10-08'
        fim: '2016-10-11'
      descricao: “Harvard Medical School Epigenetics Symposium” (Participação). Boston, MA, E.U.A.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.12
      periodo:
        inicio: '2015-09-06'
        fim: '2015-09-11'
      descricao: “Otto Warburg International Summer School and Research Symposium” (Participação e apresentação
        oral). Berlin, Alemanha.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.13
      periodo:
        inicio: '2015-07-10'
        fim: '2015-07-14'
      descricao: “International Conference on Intelligent Systems for Molecular Biology and European Conference
        on Computational Biology (ISMB/ECCB)” (Participação e apresentação oral). Dublin, Irlanda.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.14
      periodo:
        inicio: '2014-11-09'
        fim: '2014-11-14'
      descricao: “RECOMB/ISCB Conference on Regulatory and Systems Genomics” (Participação e apresentação de pôster).
        San Diego, CA, E.U.A.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.15
      periodo:
        inicio: '2014-08-11'
        fim: '2014-08-13'
      descricao: “Computational Biomedicine for Translational Research Symposium (CBTR)” (Participação). Aachen,
        Alemanha.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.16
      periodo:
        inicio: '2013-11-03'
        fim: '2013-11-06'
      descricao: “International Conference of the AB3C and Brazilian Symposium on Bioinformatics (X-meeting.BSB)”
        (Participação e apresentação oral). Recife, Pernambuco, Brasil.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.17
      periodo:
        inicio: '2013-10-12'
        fim: '2013-10-14'
      descricao: “AICES - ACCES - Computational Biology Symposium” (Participação). Aachen, Alemanha.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.18
      periodo:
        inicio: '2013-08-05'
        fim: '2013-08-07'
      descricao: “Helmholtz Symposium” (Participação e apresentação de pôster). Aachen, Alemanha.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.19
      periodo:
        inicio: '2013-04-15'
        fim: '2013-04-16'
      descricao: “5th Bioinformatics and Stem Cells Satellite Workshop” (Participação e apresentação oral). Köln,
        Alemanha.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.20
      periodo:
        inicio: '2012-08-13'
        fim: '2012-08-17'
      descricao: “Brazilian Symposium on Bioinformatics (BSB)” (Participação e apresentação oral). Campo Grande,
        Mato Grosso do Sul, Brasil.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.21
      periodo:
        inicio: '2011-07-04'
        fim: '2011-07-06'
      descricao: “Seminário Internacional sobre Resíduos de Equipamentos Eletroeletrônicos (SIREE)” (Participação).
        Recife, Pernambuco, Brasil.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.22
      periodo:
        inicio: '2010-10-04'
        fim: '2010-10-07'
      descricao: “6th International Conference of the Brazilian Association for Bioinformatics and Computational
        Biology” (Participação). Ouro Preto, Minas Gerais, Brasil.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.23
      periodo:
        inicio: '2010-08-20'
        fim: '2010-08-24'
      descricao: “18º Congresso de Iniciação Científica da UFPE” (Participação e apresentação oral). Recife, Pernambuco,
        Brasil.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.24
      periodo:
        inicio: '2010-08-31'
        fim: '2010-09-03'
      descricao: “Brazilian Symposium on Bioinformatics and International Workshop on Genomic Databases” (Participação).
        Búzios, Rio de Janeiro, Brasil.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.25
      periodo:
        inicio: '2010-03-14'
        fim: '2010-03-17'
      descricao: “14ª Jornada de Iniciação Científica” (Participação e apresentação oral). Recife, Pernambuco, Brasil.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.26
      periodo:
        inicio: '2010-03-08'
        fim: '2010-03-09'
      descricao: “1st Brazilian-German Meeting of Plant Systems Biology and Bioenergy” (Participação). Recife, Pernambuco,
        Brasil.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
    - id: 7.5.27
      periodo:
        inicio: '2008-06-02'
        fim: '2008-06-06'
      descricao: “4th Seminário de Atualização em TI” (Participação). Recife, Pernambuco, Brasil.
      modelo_sem_vinculos: '{{EVENTO}} em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.'
  fonte: 0.Curriculum.docx — 4.4 e 7.5

# Condições e valores originais preservados, inclusive financiamento declinado.
financiamentos_e_grants:
  - id: reconhecimento_1
    data: '2019-07-01'
    tipo: Subsídio total de projeto de pesquisa (co-autor)
    instituicao: Consórcio DFG / SPP 2202 [Projeto número 422389065]
    tema: “Exploring the contribution of transcription to native chromatin looping and genome conformation”
    valor_e_condicoes: € 265.000,00. (estimado).
    fonte: 0.Curriculum.docx — Projetos de subsídio para pesquisa aprovados e prêmios
    modelo_sem_vinculos: Subsídio total de projeto de pesquisa (co-autor) concedido por {{INSTITUICAO}} para {{TEMA}}.
  - id: reconhecimento_2
    data: '2017-05-28'
    tipo: Subsídio total de projeto de pesquisa (declinado pelo candidato)
    instituicao: Jane Coffin Childs Memorial Fund for Medical Research
    tema: “Computational framework to dissect single-cell gene regulatory circuitries”
    valor_e_condicoes: US$ 52.000,00; por ano; máx. 3 anos.
    fonte: 0.Curriculum.docx — Projetos de subsídio para pesquisa aprovados e prêmios
    modelo_sem_vinculos: Subsídio total de projeto de pesquisa (declinado pelo candidato) concedido por {{INSTITUICAO}}
      para {{TEMA}}.
  - id: reconhecimento_6
    data: '2016-10-17'
    tipo: Subsídio de viagem
    instituicao: RECOMB/ISCB Conference on Regulatory and Systems Genomics
    tema: “RECOMB/ISCB conference on regulatory and systems genomics”
    valor_e_condicoes: US$ 1.500,00.
    fonte: 0.Curriculum.docx — Projetos de subsídio para pesquisa aprovados e prêmios
    modelo_sem_vinculos: Subsídio de viagem concedido por {{INSTITUICAO}} para {{TEMA}}.
  - id: reconhecimento_8
    data: '2011-03-01'
    tipo: Bolsa de mestrado
    instituicao: Fundação de Amparo à Ciência e Tecnologia do Estado de Pernambuco (FACEPE)
    tema: “Prediction of TF binding sites by integrating DNase digestion and histone modification”
    valor_e_condicoes: R$ 700,00 (mensal); por 2 anos.
    fonte: 0.Curriculum.docx — Projetos de subsídio para pesquisa aprovados e prêmios
    modelo_sem_vinculos: Bolsa de mestrado concedido por {{INSTITUICAO}} para {{TEMA}}.

# Somente os quatro reconhecimentos da fonte principal.
premios_e_honrarias:
  - id: reconhecimento_3
    data: '2016-12-09'
    tipo: Melhor publicação (prêmio anual)
    instituicao: Day of Medical Research of RWTH Aachen University Medical School
    tema: “Analysis of computational footprinting methods for DNase sequencing methods”
    valor_e_condicoes: € 2.000,00.
    fonte: 0.Curriculum.docx — Projetos de subsídio para pesquisa aprovados e prêmios
    modelo_sem_vinculos: Melhor publicação (prêmio anual) concedido por {{INSTITUICAO}} para {{TEMA}}.
  - id: reconhecimento_4
    data: '2016-11-09'
    tipo: Publicação eleita entre as dez melhores – período 2015/2016
    instituicao: RECOMB/ISCB Conference on Regulatory and Systems Genomics
    tema: Publicação no item 4.1.13
    valor_e_condicoes: Prêmio não financeiro.
    fonte: 0.Curriculum.docx — Projetos de subsídio para pesquisa aprovados e prêmios
    modelo_sem_vinculos: Publicação eleita entre as dez melhores – período 2015/2016 concedido por {{INSTITUICAO}}
      para {{TEMA}}.
  - id: reconhecimento_5
    data: '2016-11-09'
    tipo: 3º lugar no desafio “ENCODE-DREAM in vivo TFBS Prediction Challenge”
    instituicao: RECOMB/ISCB Conference on Regulatory and Systems Genomics
    tema: Publicação no item 4.1.13
    valor_e_condicoes: Prêmio não financeiro.
    fonte: 0.Curriculum.docx — Projetos de subsídio para pesquisa aprovados e prêmios
    modelo_sem_vinculos: 3º lugar no desafio “ENCODE-DREAM in vivo TFBS Prediction Challenge” concedido por {{INSTITUICAO}}
      para {{TEMA}}.
  - id: reconhecimento_7
    data: '2013-11-06'
    tipo: Melhor apresentação oral
    instituicao: International Conf. of the AB3C & Brazilian Symposium on Bioinformatics (X-meeting/BSB)
    tema: “Search of cell-specific TFBS with DNase hypersensitivity and histone modifications”
    valor_e_condicoes: Prêmio não financeiro.
    fonte: 0.Curriculum.docx — Projetos de subsídio para pesquisa aprovados e prêmios
    modelo_sem_vinculos: Melhor apresentação oral concedido por {{INSTITUICAO}} para {{TEMA}}.

# Fonte: 0.Curriculum.docx, seção 3.2. Cargas horárias pendentes.
experiencia_docente:
  - id: 3.2.1
    atividade_e_instituicao: Docência em Universidade Técnica de Munique
    disciplina_e_codigo: “Técnicas de Edição de Genoma” (BGN714).
    periodo:
      inicio: '2024-06-01'
      fim: '{{3_2_1_FIM}}'
    semestres: Um (1+) semestre.
    carga_horaria: '{{CARGA_HORARIA_3_2_1}}'
    modelo_sem_vinculos: Docência de “Técnicas de Edição de Genoma” (BGN714). em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 3.2.2
    atividade_e_instituicao: Docência em Universidade Técnica de Munique
    disciplina_e_codigo: “Tópicos Modernos em Imunoterapia do Câncer” (MEG833).
    periodo:
      inicio: '2024-01-01'
      fim: '{{3_2_2_FIM}}'
    semestres: Dois (2+) semestres.
    carga_horaria: '{{CARGA_HORARIA_3_2_2}}'
    modelo_sem_vinculos: Docência de “Tópicos Modernos em Imunoterapia do Câncer” (MEG833). em {{INSTITUICAO}},
      {{CIDADE}}, {{PAIS}}.
  - id: 3.2.3
    atividade_e_instituicao: Docência em Universidade Técnica de Munique
    disciplina_e_codigo: “Biologia da Cromatina Avançada” (BIO303).
    periodo:
      inicio: '2024-01-01'
      fim: '{{3_2_3_FIM}}'
    semestres: Dois (2+) semestres.
    carga_horaria: '{{CARGA_HORARIA_3_2_3}}'
    modelo_sem_vinculos: Docência de “Biologia da Cromatina Avançada” (BIO303). em {{INSTITUICAO}}, {{CIDADE}},
      {{PAIS}}.
  - id: 3.2.4
    atividade_e_instituicao: Docência em Universidade Técnica de Munique
    disciplina_e_codigo: “Redes Neurais Profundas Probabilísticas” (KUI600).
    periodo:
      inicio: '2024-01-01'
      fim: '{{3_2_4_FIM}}'
    semestres: Dois (2+) semestres.
    carga_horaria: '{{CARGA_HORARIA_3_2_4}}'
    modelo_sem_vinculos: Docência de “Redes Neurais Profundas Probabilísticas” (KUI600). em {{INSTITUICAO}}, {{CIDADE}},
      {{PAIS}}.
  - id: 3.2.5
    atividade_e_instituicao: Docência em Universidade Federal de Pernambuco
    disciplina_e_codigo: “Tópicos Avançados em SI 5 – Empreendedorismo em Biotecnologia” (IF1014).
    periodo:
      inicio: '2024-04-01'
      fim: '2024-08-20'
    semestres: Um (1) semestre.
    carga_horaria: '{{CARGA_HORARIA_3_2_5}}'
    modelo_sem_vinculos: Docência de “Tópicos Avançados em SI 5 – Empreendedorismo em Biotecnologia” (IF1014). em
      {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 3.2.6
    atividade_e_instituicao: Docência em Universidade Federal de Pernambuco
    disciplina_e_codigo: “Inteligência Artificial” (IF1017).
    periodo:
      inicio: '2024-04-01'
      fim: '2024-08-20'
    semestres: Um (1) semestre.
    carga_horaria: '{{CARGA_HORARIA_3_2_6}}'
    modelo_sem_vinculos: Docência de “Inteligência Artificial” (IF1017). em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 3.2.7
    atividade_e_instituicao: Docência em Universidade Federal de Pernambuco
    disciplina_e_codigo: “Computação Eletrônica” (IF165).
    periodo:
      inicio: '2024-04-01'
      fim: '2024-10-18'
    semestres: Um (1) semestre (duas turmas – S2 e S8).
    carga_horaria: '{{CARGA_HORARIA_3_2_7}}'
    modelo_sem_vinculos: Docência de “Computação Eletrônica” (IF165). em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 3.2.8
    atividade_e_instituicao: Docência em Universidade de Turku
    disciplina_e_codigo: “Complex Linear Algebra for Biology” (MA7716).
    periodo:
      inicio: '2023-01-22'
      fim: '2023-12-16'
    semestres: Dois (2) semestres.
    carga_horaria: '{{CARGA_HORARIA_3_2_8}}'
    modelo_sem_vinculos: Docência de “Complex Linear Algebra for Biology” (MA7716). em {{INSTITUICAO}}, {{CIDADE}},
      {{PAIS}}.
  - id: 3.2.9
    atividade_e_instituicao: Docência em Universidade de Turku
    disciplina_e_codigo: “Modern Machine Learning” (CB3444).
    periodo:
      inicio: '2023-01-15'
      fim: '2023-12-09'
    semestres: Dois (2) semestres.
    carga_horaria: '{{CARGA_HORARIA_3_2_9}}'
    modelo_sem_vinculos: Docência de “Modern Machine Learning” (CB3444). em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 3.2.10
    atividade_e_instituicao: Docência em Georg-August-Universität Göttingen
    disciplina_e_codigo: “Machine Learning and Intelligent Systems” (CC112).
    periodo:
      inicio: '2019-07-01'
      fim: '2022-12-31'
    semestres: Sete (7) semestres.
    carga_horaria: '{{CARGA_HORARIA_3_2_10}}'
    modelo_sem_vinculos: Docência de “Machine Learning and Intelligent Systems” (CC112). em {{INSTITUICAO}}, {{CIDADE}},
      {{PAIS}}.
  - id: 3.2.11
    atividade_e_instituicao: Docência em Georg-August-Universität Göttingen
    disciplina_e_codigo: “Introduction to Bioinformatics” (BG336).
    periodo:
      inicio: '2019-07-01'
      fim: '{{3_2_11_FIM}}'
    semestres: Sete (7) semestres.
    carga_horaria: '{{CARGA_HORARIA_3_2_11}}'
    modelo_sem_vinculos: Docência de “Introduction to Bioinformatics” (BG336). em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 3.2.12
    atividade_e_instituicao: Docência em Harvard T.H. Chan School of Public Health
    disciplina_e_codigo: “Introduction to Computational Biology and Bioinformatics” (STAT115/215).
    periodo:
      inicio: '2017-01-23'
      fim: '2017-06-05'
    semestres: Um (1) semestre.
    carga_horaria: '{{CARGA_HORARIA_3_2_12}}'
    modelo_sem_vinculos: Docência de “Introduction to Computational Biology and Bioinformatics” (STAT115/215). em
      {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 3.2.13
    atividade_e_instituicao: Docência em Harvard T.H. Chan School of Public Health
    disciplina_e_codigo: “Big Data Statistics in Genomic and Genetic Research” (STAT316).
    periodo:
      inicio: '2017-01-23'
      fim: '2017-06-05'
    semestres: Um (1) semestre.
    carga_horaria: '{{CARGA_HORARIA_3_2_13}}'
    modelo_sem_vinculos: Docência de “Big Data Statistics in Genomic and Genetic Research” (STAT316). em {{INSTITUICAO}},
      {{CIDADE}}, {{PAIS}}.
  - id: 3.2.14
    atividade_e_instituicao: Co-docência em RWTH Aachen University
    disciplina_e_codigo: “Practical Course in Bioinformatics 2016” (SoSe2016).
    periodo:
      inicio: '2016-06-01'
      fim: '2016-12-20'
    semestres: Um (1) semestre.
    carga_horaria: '{{CARGA_HORARIA_3_2_14}}'
    modelo_sem_vinculos: Docência de “Practical Course in Bioinformatics 2016” (SoSe2016). em {{INSTITUICAO}}, {{CIDADE}},
      {{PAIS}}.
  - id: 3.2.15
    atividade_e_instituicao: Co-docência em RWTH Aachen University
    disciplina_e_codigo: “Practical Course in Bioinformatics 2015” (SoSe2015).
    periodo:
      inicio: '2015-06-09'
      fim: '2015-12-21'
    semestres: Um (1) semestre.
    carga_horaria: '{{CARGA_HORARIA_3_2_15}}'
    modelo_sem_vinculos: Docência de “Practical Course in Bioinformatics 2015” (SoSe2015). em {{INSTITUICAO}}, {{CIDADE}},
      {{PAIS}}.
  - id: 3.2.16
    atividade_e_instituicao: Co-docência de curso em RWTH Aachen University
    disciplina_e_codigo: “Computational Biomedicine Practical Seminar” (SoSe2013).
    periodo:
      inicio: '2013-01-17'
      fim: '2013-06-28'
    semestres: Um (1) semestre.
    carga_horaria: '{{CARGA_HORARIA_3_2_16}}'
    modelo_sem_vinculos: Docência de “Computational Biomedicine Practical Seminar” (SoSe2013). em {{INSTITUICAO}},
      {{CIDADE}}, {{PAIS}}.
  - id: 3.2.17
    atividade_e_instituicao: Monitoria em Universidade Federal de Pernambuco
    disciplina_e_codigo: Algoritmos e Métodos para Bioinformática e Biologia Computacional (IN1101).
    periodo:
      inicio: '2011-03-01'
      fim: '2011-07-30'
    semestres: Um (1) semestre.
    carga_horaria: '{{CARGA_HORARIA_3_2_17}}'
    modelo_sem_vinculos: Docência de Algoritmos e Métodos para Bioinformática e Biologia Computacional (IN1101).
      em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 3.2.18
    atividade_e_instituicao: Monitoria em Universidade Federal de Pernambuco
    disciplina_e_codigo: Lógica para ciência da computação (IF673).
    periodo:
      inicio: '2007-08-01'
      fim: '2008-12-31'
    semestres: Um (1) semestre.
    carga_horaria: '{{CARGA_HORARIA_3_2_18}}'
    modelo_sem_vinculos: Docência de Lógica para ciência da computação (IF673). em {{INSTITUICAO}}, {{CIDADE}},
      {{PAIS}}.
  - id: 3.2.19
    atividade_e_instituicao: Monitoria em Universidade Federal de Pernambuco
    disciplina_e_codigo: Álgebra vetorial e linear para ciência da computação (MA531).
    periodo:
      inicio: '2007-01-01'
      fim: '2008-07-31'
    semestres: Três (3) semestres.
    carga_horaria: '{{CARGA_HORARIA_3_2_19}}'
    modelo_sem_vinculos: Docência de Álgebra vetorial e linear para ciência da computação (MA531). em {{INSTITUICAO}},
      {{CIDADE}}, {{PAIS}}.

# Etapas distintas da mesma pessoa não representam novos orientandos.
mentoria_e_orientacao:
  fonte: 0.Curriculum.docx — 3.1
  criterio: Dez registros de orientação, correspondentes a sete pessoas; nível e período distinguem etapas da mesma
    pessoa. Não presumir orientação principal ou vínculo formal.
  registros:
    - id: 3.1.1
      orientando: Ilia Varamogianni-Mamatsi
      instituicao: Universitätsmedizin Göttingen
      nivel: Doutorado
      tema: Architectural features of the chromatin on senescence-escape mechanisms
      periodo:
        inicio: '2023-03-01'
        fim: '{{3_1_1_FIM}}'
      avaliacao_final: '{{AVALIACAO_ILIA_DOUTORADO}}'
      modelo_sem_vinculos: Orientação de Ilia Varamogianni-Mamatsi em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 3.1.2
      orientando: Hélène Kabbech
      instituicao: Erasmus University Medical Center
      nivel: Doutorado
      tema: 'Accurate estimation of particle dynamics bypassing substrate drift bias: Application to cell nucleus
        motion using deep learning'
      periodo:
        inicio: '2021-03-01'
        fim: '2024-04-10'
      avaliacao_final: 1.25 (Magna Cum Laude).
      modelo_sem_vinculos: Orientação de Hélène Kabbech em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: 3.1.3
      orientando: Yajie Zhu
      instituicao: Universitätsmedizin Göttingen
      nivel: Doutorado
      tema: Studying variant U1 snRNA’s function in RNA splicing with RNA-seq analysis
      periodo:
        inicio: '2020-12-01'
        fim: '2024-02-19'
      avaliacao_final: 1.5 (Magna Cum Laude).
      modelo_sem_vinculos: Orientação de Yajie Zhu em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: 3.1.4
      orientando: Chairini Cássia Thomé
      instituicao: Universitätsmedizin Göttingen
      nivel: Doutorado
      tema: The role of GTPases in ribonucleoprotein complex dynamics
      periodo:
        inicio: '2020-02-03'
        fim: '2024-01-12'
      avaliacao_final: 1.75 (Magna Cum Laude).
      modelo_sem_vinculos: Orientação de Chairini Cássia Thomé em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 3.1.5
      orientando: Shu Zhang
      instituicao: Universitätsmedizin Göttingen
      nivel: Doutorado
      tema: Exploring the roles of RNAPII in genome organization
      periodo:
        inicio: '2019-05-02'
        fim: '2023-08-14'
      avaliacao_final: 1.25 (Magna Cum Laude).
      modelo_sem_vinculos: Orientação de Shu Zhang em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: 3.1.6
      orientando: Hélène Kabbech
      instituicao: University of Paris Diderot & Univ.-medizin Göttingen
      nivel: Mestrado
      tema: An integrative deep-learning framework for analyzing the interplay between chromatin conformation and
        epigenetics
      periodo:
        inicio: '2019-01-02'
        fim: '2021-02-09'
      avaliacao_final: 15.639/20 (Mention Bien).
      modelo_sem_vinculos: Orientação de Hélène Kabbech em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: 3.1.7
      orientando: Ilia Varamogianni-Mamatsi
      instituicao: Biology University of Crete
      nivel: Mestrado
      tema: HMGB1 coordinates SASP-related chromatin folding and RNA homeostasis on the path to senescence
      periodo:
        inicio: '2018-01-08'
        fim: '2020-11-16'
      avaliacao_final: 9.26.
      modelo_sem_vinculos: Orientação de Ilia Varamogianni-Mamatsi em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 3.1.8
      orientando: Matthew Ploenzke
      instituicao: Harvard T.H. Chan School of Public Health
      nivel: Doutorado
      tema: Reassessing pharmacogenomic cell sensitivity with multilevel statistical models
      periodo:
        inicio: '2015-09-14'
        fim: '2020-06-29'
      avaliacao_final: 9.4 (Magna Cum Laude).
      modelo_sem_vinculos: Orientação de Matthew Ploenzke em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: 3.1.9
      orientando: Yajie Zhu
      instituicao: Universitätsmedizin Göttingen
      nivel: Mestrado
      tema: Changes of genome topology drive escape from oncogene-induced senescence
      periodo:
        inicio: '2018-09-03'
        fim: '2020-05-04'
      avaliacao_final: 1.0 (Sehr Gut).
      modelo_sem_vinculos: Orientação de Yajie Zhu em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: 3.1.10
      orientando: Ahmad Badar
      instituicao: RWTH Aachen University
      nivel: Doutorado
      tema: Interpretable deep learning for cell-segmentation image data
      periodo:
        inicio: '2015-05-04'
        fim: '2019-09-23'
      avaliacao_final: 1.5 (Magna Cum Laude).
      modelo_sem_vinculos: Orientação de Ahmad Badar em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.

# Administração, bancas e revisão por pares; não implicam cargo de editor.
servico_e_lideranca:
  fonte: 0.Curriculum.docx — 6 e 7.1–7.3
  administracao:
    - id: '6.1'
      funcao: Chefe da Coordenadoria Científica
      instituicao: Universidade de Turku – Turku, Finlândia
      periodo:
        inicio: '2023-01-17'
        fim: '2023-12-18'
      modelo_sem_vinculos: Chefe da Coordenadoria Científica em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: '6.2'
      funcao: Chefe da Coordenadoria de Finanças e Ordens (Leiter der Abteilung Finanzen & Bestellung Koordinierung)
      instituicao: Georg-August-Universität Göttingen – Göttingen, Alemanha
      periodo:
        inicio: '2021-05-01'
        fim: '2022-12-31'
      modelo_sem_vinculos: Chefe da Coordenadoria de Finanças e Ordens (Leiter der Abteilung Finanzen & Bestellung
        Koordinierung) em {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
    - id: '6.3'
      funcao: Coordenador de Finanças e Ordens (Finanzen & Bestellung Koordinieren)
      instituicao: Georg-August-Universität Göttingen – Göttingen, Alemanha
      periodo:
        inicio: '2020-07-01'
        fim: '{{6_3_FIM}}'
      modelo_sem_vinculos: Coordenador de Finanças e Ordens (Finanzen & Bestellung Koordinieren) em {{INSTITUICAO}},
        {{LABORATORIO}}, {{CIDADE}}, {{PAIS}}.
  bancas_academicas:
    - id: 7.1.1
      data: '2024-04-10'
      atividade: Doutorado de Hélène Kabbech
      instituicao: Erasmus University Medical Center (Erasmus MC), Rotterdam, Holanda
      titulo: 'Accurate estimation of particle dynamics bypassing substrate drift bias: Application to Cell Nucleus
        Motion using deep learning'
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 7.1.2
      data: '2024-02-19'
      atividade: Doutorado de Yajie Zhu
      instituicao: Georg-August-Universität Göttingen, Göttingen, Alemanha
      titulo: Studying variant U1 snRNA’s function in RNA splicing with RNA-seq analysis
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 7.1.3
      data: '2024-01-12'
      atividade: Doutorado de Chairini Cássia Thomé
      instituicao: Georg-August-Universität Göttingen, Göttingen, Alemanha
      titulo: The role of GTPases in ribonucleoprotein complex dynamics
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 7.1.4
      data: '2023-12-13'
      atividade: Licenciatura de Rusti Ponte de Sousa
      instituicao: Universidade Federal de Pernambuco (UFPE), Recife, Brasil
      titulo: A percepção de professores diante da importância da educação emocional e seus benefícios para o processo
        ensino/aprendizagem
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 7.1.5
      data: '2023-08-14'
      atividade: Doutorado de Shu Zhang
      instituicao: Georg-August-Universität Göttingen, Göttingen, Alemanha
      titulo: Exploring the roles of RNAPII in genome organization
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 7.1.6
      data: '2021-02-09'
      atividade: Mestrado de Hélène Kabbech
      instituicao: University of Paris Diderot (Paris 7), Paris, França & University of Bergen CBU, Bergen, Noruega
        & Georg-August-Universität Göttingen, Göttingen, Alemanha
      titulo: An integrative deep-learning framework for analyzing the interplay between chromatin conformation
        and epigenetics
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 7.1.7
      data: '2020-11-16'
      atividade: Mestrado de Ilia Varamogianni-Mamatsi
      instituicao: Biology University of Crete, Creta, Grécia
      titulo: HMGB1 coordinates SASP-related chromatin folding and RNA homeostasis on the path to senescence
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 7.1.8
      data: '2020-06-29'
      atividade: Doutorado de Matthew Ploenzke
      instituicao: Harvard T. H. Chan School of Public Health, Boston, Estados Unidos
      titulo: Reassessing pharmacogenomic cell sensitivity with multilevel statistical models
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 7.1.9
      data: '2020-05-04'
      atividade: Mestrado de Yajie Zhu
      instituicao: Georg-August-Universität Göttingen, Göttingen, Alemanha
      titulo: Changes of genome topology drive escape from oncogene-induced senescence
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 7.1.10
      data: '2020-01-07'
      atividade: Mestrado de Chairini Cássia Thomé
      instituicao: Universidade Federal do Rio Grande do Sul (UFRGS), Porto Alegre, Rio Grande do Sul, Brasil
      titulo: Investigação do potencial prognóstico de receptores metabotrópicos de glutamato em glioblastoma
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 7.1.11
      data: '2019-09-23'
      atividade: Doutorado de Ahmad Badar
      instituicao: RWTH University Aachen, Aachen, Alemanha
      titulo: Interpretable deep learning for cell-segmentation image data
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
  avaliacao_de_projetos:
    - id: 7.2.1
      data: '2024-01-10'
      atividade: Pedido de subsídio para o DFG (Deutscheforscungsgemeinschaft)
      instituicao: Technical University of Munich (TUM) & DFG
      titulo: 'Accelerating drug development for lung diseases: New insights from single-cell genomics'
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 7.2.2
      data: '2023-09-03'
      atividade: Pedido de subsídio para o DFG (Deutscheforscungsgemeinschaft)
      instituicao: University of Bonn & DFG
      titulo: 'MK-BMC: a Multi-kernel framework with boosted distance metrics for microbiome data for classification'
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 7.2.3
      data: '2023-06-19'
      atividade: Pedido de subsídio para o DFG (Deutscheforscungsgemeinschaft)
      instituicao: Humboldt University of Berlin & DFG
      titulo: Temporal analysis of relative distances is a robust, parameter-free alternative to single-particle
        tracking
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 7.2.4
      data: '2022-08-06'
      atividade: Pedido de subsídio para o DFG (Deutscheforscungsgemeinschaft)
      instituicao: Karlsruhe Institute of Technology (KIT) & DFG
      titulo: 'Geological risk calculation through probability of success (PoS), Applied to radioactive waste disposal
        in deep wells: A practical study in the pre-neogene basement in the northern croatia'
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
    - id: 7.2.5
      data: '2022-04-13'
      atividade: Pedido de subsídio para o J.C. Childs Memorial Fund for Medical Research
      instituicao: Harvard University & Coffin Childs Memorial Fund for Medical Research
      titulo: Statistical model for sampling cell-specific organoids
      modelo_sem_vinculos: Participação em banca de {{TITULO_TRABALHO_OU_PROJETO}} em {{INSTITUICAO}}, {{CIDADE}},
        {{PAIS}}.
  revisao_por_pares:
    - id: 7.3.1
      atividade: Revisor na revista “PLoS Computational Biology”.
      periodo:
        inicio: '2019-08-07'
        fim: '{{7_3_1_FIM}}'
    - id: 7.3.2
      atividade: Revisor na revista “Nucleic Acids Research”.
      periodo:
        inicio: '2017-02-21'
        fim: '{{7_3_2_FIM}}'
    - id: 7.3.3
      atividade: Revisor na revista “Bioinformatics (Oxford Print)”.
      periodo:
        inicio: '2015-01-16'
        fim: '{{7_3_3_FIM}}'
  organizacao_de_eventos: []

# Atividades de ensino e divulgação para públicos externos.
extensao:
  - id: 4.5.1
    atividade_e_instituicao: Projeto de Extensão com apoio da Universidade Técnica de Munique
    projeto: Ensino de “Fundamentos da Álgebra com Python” os graus 12 e 13 da “Realschule” e “Gymnasium” (correspondem,
      com pequenas diferenças, ao ensino médio brasileiro).
    periodo:
      inicio: '2024-01-15'
      fim: '{{4_5_1_FIM}}'
    carga_horaria_declarada: 84h / termos (dois termos = ~1.8 semestre brasileiro).
    modelo_sem_vinculos: 'Ensino e divulgação científica em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}; tema: {{TEMA}}.'
  - id: 4.5.2
    atividade_e_instituicao: Projeto de Extensão com apoio da Turku University
    projeto: Ensino de “Precálculo com Python” para o terceiro grau das “Escolas gerais de ensino médio” e “Institutos
      vocacionais” (equivalente direto ao ensino médio brasileiro).
    periodo:
      inicio: '2023-07-10'
      fim: '2023-12-22'
    carga_horaria_declarada: 96h / semestre.
    modelo_sem_vinculos: 'Ensino e divulgação científica em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}; tema: {{TEMA}}.'
  - id: 4.5.3
    atividade_e_instituicao: Projeto de Extensão com apoio da Turku University
    projeto: 'Ensino de “Precálculo com Python” para o terceiro grau das “Escolas gerais de ensino médio” e “Institutos
      vocacionais” (equivalente direto ao ensino médio brasileiro). '
    periodo:
      inicio: '2023-01-16'
      fim: '2023-06-16'
    carga_horaria_declarada: 96h / semestre.
    modelo_sem_vinculos: 'Ensino e divulgação científica em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}; tema: {{TEMA}}.'
  - id: 4.5.4
    atividade_e_instituicao: Projeto de Extensão com apoio da Georg-August-Universität Göttingen
    projeto: Ensino de “Lógica de Programação e Algoritmos Básicos” para os graus 12 e 13 da “Gesamtschule” e “Gymnasium”
      (correspondem, com pequenas diferenças, ao ensino médio brasileiro).
    periodo:
      inicio: '2022-03-07'
      fim: '2022-12-21'
    carga_horaria_declarada: 84h / termos (dois termos = ~1.8 semestre brasileiro). Total = 168h.
    modelo_sem_vinculos: 'Ensino e divulgação científica em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}; tema: {{TEMA}}.'
  - id: 4.5.5
    atividade_e_instituicao: Projeto de Extensão com apoio da Georg-August-Universität Göttingen
    projeto: 'Aulas abertas para o público sobre: “The future of artificial intelligence”.'
    periodo:
      inicio: '2021-08-02'
      fim: '2022-02-18'
    carga_horaria_declarada: 116h / termo (um termo = um semestre).
    modelo_sem_vinculos: 'Ensino e divulgação científica em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}; tema: {{TEMA}}.'
  - id: 4.5.6
    atividade_e_instituicao: Projeto de Extensão com apoio da Georg-August-Universität Göttingen
    projeto: 'Aulas abertas para o público sobre: “Are social media making me ill?”.'
    periodo:
      inicio: '2021-01-04'
      fim: '2021-07-23'
    carga_horaria_declarada: 116h / termo (um termo = um semestre).
    modelo_sem_vinculos: 'Ensino e divulgação científica em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}; tema: {{TEMA}}.'
  - id: 4.5.7
    atividade_e_instituicao: Projeto de Extensão com apoio da Georg-August-Universität Göttingen
    projeto: 'Aulas abertas para o público sobre: “Do vaccines contain microchips? Why should I get vaccinated.”.'
    periodo:
      inicio: '2020-06-01'
      fim: '2020-12-18'
    carga_horaria_declarada: 116h / termo (um termo = um semestre).
    modelo_sem_vinculos: 'Ensino e divulgação científica em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}; tema: {{TEMA}}.'

# Cursos realizados, separados de certificações profissionais.
formacao_complementar:
  - id: 7.4.1
    periodo:
      inicio: '2024-09-23'
      fim: '2024-09-23'
    curso_carga_e_instituicao: “Biossegurança” (50h). Unidade Fiocruz Pernambuco, Fundação Oswaldo Cruz.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.2
    periodo:
      inicio: '2014-03-10'
      fim: '2014-03-12'
    curso_carga_e_instituicao: “Proteomics Informatics Primer Workshop” (12h). Helmholtz Institute for Biomedical
      Engineering, Aachen, Alemanha.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.3
    periodo:
      inicio: '2013-11-04'
      fim: '2013-11-22'
    curso_carga_e_instituicao: '“Epigenetic Control of Gene Expression with Dr. Marnie Blewitt” (48h). The University
      of Melbourne, Melbourne, Australia. Avaliação Final: 100%.'
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.4
    periodo:
      inicio: '2013-06-24'
      fim: '2013-06-28'
    curso_carga_e_instituicao: “Computational Statistics for Genome Biology (CSAMA)” (40h). Bioconductor et al.,
      Department of Economics, Management and Quantitative Methods, University of Milan, Bressanone-Brixen, Itália.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.5
    periodo:
      inicio: '2013-01-07'
      fim: '2013-01-31'
    curso_carga_e_instituicao: '“Introduction to Genetics and Evolution with Dr. Mohamed Noor” (72h). Duke University,
      Durham, E.U.A. Avaliação Final: 97:5%.'
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.6
    periodo:
      inicio: '2012-08-13'
      fim: '2012-08-13'
    curso_carga_e_instituicao: “Bioinformatics Tools for Next Generation Sequencing” (8h). Brazilian Bioinformatics
      School, Brazilian Symposium on Bioinformatics (BSB), Campo Grande, Mato Grosso do Sul, Brasil.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.7
    periodo:
      inicio: '2012-08-13'
      fim: '2012-08-13'
    curso_carga_e_instituicao: “Biological Databases” (8h). Brazilian Bioinformatics School, Brazilian Symposium
      on Bioinformatics (BSB), Campo Grande, Mato Grosso do Sul, Brasil.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.8
    periodo:
      inicio: '2012-03-05'
      fim: '2012-03-23'
    curso_carga_e_instituicao: '“Introduction to Sociology with Dr. Mitchell Duneier” (50h). Princeton University,
      Princeton, E.U.A. Avaliação Final: 92%.'
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.9
    periodo:
      inicio: '2012-01-23'
      fim: '2012-01-27'
    curso_carga_e_instituicao: “Computação Científica com Python” (20h). Python Distance Learning Platform.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.10
    periodo:
      inicio: '2012-01-09'
      fim: '2012-01-20'
    curso_carga_e_instituicao: “Administração de Segurança em Sistemas Linux” (40h). Instituto Fuctura, Recife,
      Pernambuco, Brasil.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.11
    periodo:
      inicio: '2011-12-01'
      fim: '2011-12-16'
    curso_carga_e_instituicao: '“Bioinformática: Ferramentas e Aplicações” (45h). Universidade Federal de Pernambuco,
      Recife, Pernambuco, Brasil.'
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.12
    periodo:
      inicio: '2011-07-21'
      fim: '2011-08-21'
    curso_carga_e_instituicao: “Biologia Molecular” (80h). Portal Brasileiro de Ensino à Distância.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.13
    periodo:
      inicio: '2011-07-01'
      fim: '2011-07-20'
    curso_carga_e_instituicao: “Introdução a Python” (40h). Universidade Federal de Pernambuco, Recife, Pernambuco,
      Brasil.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.14
    periodo:
      inicio: '2011-05-16'
      fim: '2011-05-20'
    curso_carga_e_instituicao: “Administração de Servidores com Redes Mistas” (25h). Instituto Fuctura, Recife,
      Pernambuco, Brasil.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.15
    periodo:
      inicio: '2011-05-09'
      fim: '2011-05-13'
    curso_carga_e_instituicao: “Gerenciamento de Sistemas em Linux” (30h). Instituto Fuctura, Recife, Pernambuco,
      Brasil.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.16
    periodo:
      inicio: '2011-03-07'
      fim: '2011-03-11'
    curso_carga_e_instituicao: “Curso de Verão de Bioinformática” (40h). Universidade de São Paulo, São Paulo, Brasil.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.17
    periodo:
      inicio: '2010-10-04'
      fim: '2010-10-04'
    curso_carga_e_instituicao: >-
      “Perl for Bioinformatics and Computational Biology” (3h). Brazilian Association of Bioinformatics and Computational
      Biology, International Conference of the AB3C (X-Meeting), Ouro Preto, Minas Gerais, Brasil.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.18
    periodo:
      inicio: '2010-09-01'
      fim: '2010-09-01'
    curso_carga_e_instituicao: “Métodos para Alinhamento de Sequências” (8h). Escola Brasileira de Bioinformática,
      Brazilian Symposium on Bioinformatics (BSB), Búzios, Rio de Janeiro, Brasil.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.19
    periodo:
      inicio: '2010-09-01'
      fim: '2010-09-01'
    curso_carga_e_instituicao: “Métodos de Genómica Comparativa” (8h). Escola Brasileira de Bioinformática, Brazilian
      Symposium on Bioinformatics (BSB), Búzios, Rio de Janeiro, Brasil.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.20
    periodo:
      inicio: '2010-08-31'
      fim: '2010-08-31'
    curso_carga_e_instituicao: “Bioinformática Estrutural de Proteínas” (8h). Escola Brasileira de Bioinformática,
      Brazilian Symposium on Bioinformatics (BSB), Búzios, Rio de Janeiro, Brasil.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.21
    periodo:
      inicio: '2010-08-31'
      fim: '2010-08-31'
    curso_carga_e_instituicao: “Probabilidade e Estatística em Bioinformática” (8h). Escola Brasileira de Bioinformática,
      Brazilian Symposium on Bioinformatics (BSB), Búzios, Rio de Janeiro, Brasil.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.22
    periodo:
      inicio: '2010-07-12'
      fim: '2010-07-16'
    curso_carga_e_instituicao: “Curso de Inverno de Bioinformática” (33h). Universidade de São Paulo, Ribeirão Preto,
      Brasil.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.23
    periodo:
      inicio: '2009-07-01'
      fim: '2009-07-16'
    curso_carga_e_instituicao: “Introduçäo a .NET com C#” (30h). Universidade Federal de Pernambuco, Recife, Pernambuco,
      Brasil.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.
  - id: 7.4.24
    periodo:
      inicio: '2007-07-01'
      fim: '2007-07-16'
    curso_carga_e_instituicao: “Introduçäo a C e C++” (30h). Universidade Federal de Pernambuco, Recife, Pernambuco,
      Brasil.
    modelo_sem_vinculos: Curso de {{TEMA}} em {{INSTITUICAO}}, {{CIDADE}}, {{PAIS}}.

# Inventário conservador; nível e uso profissional não presumidos. STUB — indústria.
habilidades_tecnicas:
  pesquisa:
    metodos:
      - Modelagem estatística e probabilística
      - Modelos ocultos de Markov para footprinting
      - machine learning e deep learning para dados biológicos
      - Análise de cromatina, regulação gênica e integração multiômica
    fontes:
      - 0.Curriculum.docx
      - 8_Research_Statement.docx
    observacao: Não atribuir tecnologias a vínculos específicos sem evidência.
  conhecimentos_a_classificar:
    linguagens:
      - Python
      - R
      - SQL
      - C/C++
      - Bash/Shell
    frameworks:
      - PyTorch
      - TensorFlow
      - JAX
      - scikit-learn
    ferramentas:
      - NumPy
      - pandas
      - SciPy
      - Bioconductor
      - Git
    ambientes:
      - Linux
      - HPC
      - SLURM
      - Docker
      - Singularity
    fonte: CV.yaml — Development_Environment, apenas como inventário candidato
    nivel: '{{NIVEIS_E_EVIDENCIAS_TECNICAS}}'
  conhecimentos_basicos_a_confirmar:
    topicos:
      - Computação em nuvem
      - Bancos de dados
      - APIs
      - Integração contínua
      - Contêineres e orquestração
    nivel: '{{CONHECIMENTOS_BASICOS_CONFIRMADOS}}'
    observacao: Não se presume domínio ou experiência de produção a partir da enumeração anterior.
  industria:
    - competencia: '{{COMPETENCIA_INDUSTRIA}}'
      nivel: '{{NIVEL_COMPETENCIA_INDUSTRIA}}'
      evidencia: '{{EVIDENCIA_COMPETENCIA_INDUSTRIA}}'

# Contribuições vinculadas à bibliografia; repositórios e versões a confirmar.
software_e_metodos:
  - nome: HINT
    descricao: Identificação computacional de sítios de ligação de fatores de transcrição.
    evidencia:
      - 4.1.14
      - 4.1.18
    repositorio: '{{URL_HINT}}'
  - nome: RGT
    descricao: Ferramentas para análise integrativa de genômica regulatória.
    evidencia:
      - 4.1.2
    repositorio: '{{URL_RGT}}'
  - nome: Bloom
    descricao: Método para explorar padrões de conformação da cromatina; arquitetura detalhada e estado de publicação
      a confirmar.
    evidencia:
      - 4.3.2
      - 4.4.2
      - 8_Research_Statement.docx
    repositorio: '{{URL_BLOOM}}'

# STUB — preencher em passes futuros; entrada não é certificação obtida.
certificacoes:
  - situacao: Rascunho; não contabilizar como certificação obtida
    nome: '{{CERTIFICACAO}}'
    emissor: '{{INSTITUICAO}}'
    data: '{{DATA_CERTIFICACAO}}'
    credencial: '{{URL_CREDENCIAL}}'
    modelo_sem_vinculos: '{{CERTIFICACAO}} emitida por {{INSTITUICAO}} em {{DATA_CERTIFICACAO}}.'

# Modelos sem instituições específicas; agendas futuras são propostas.
declaracoes:
  pesquisa:
    fonte: 8_Research_Statement.docx
    texto_sem_vinculos: >-
      Como Biólogo Computacional, desenvolvo métodos para relacionar regulação gênica, arquitetura da cromatina
      e estados celulares. Minha agenda integra bioinformática multiômica, modelagem probabilística e machine learning/deep
      learning para estudar senescência e envelhecimento. Em {{INSTITUICAO}}, junto a {{LABORATORIO}}, proponho
      investigar biomarcadores de arquitetura da cromatina, integrar sinais epigenômicos e transcriptômicos e avaliar
      sua utilidade em hipóteses de descoberta de fármacos e terapias. Pretendo distinguir associação de mecanismos
      causais, comparar métodos e colaborar com especialistas experimentais. Essas aplicações constituem objetivos
      de pesquisa, não resultados clínicos já demonstrados.
  ensino:
    fonte: 9_Teaching_Statement.docx
    texto_sem_vinculos: >-
      Minha prática docente valoriza aprendizagem ativa, resolução de problemas e autonomia. Integro fundamentos
      de computação, estatística e biologia a atividades com dados, com objetivos claros e avaliação formativa.
      Na orientação, busco estabelecer metas realistas, oferecer devolutivas regulares e apoiar o desenvolvimento
      acadêmico e profissional. Em {{INSTITUICAO}}, pretendo contribuir com disciplinas de biologia computacional,
      bioinformática multiômica e machine learning, adaptadas a {{PUBLICO_ALVO}} e ao contexto de {{CURSO}}.
  equidade_diversidade_e_inclusao:
    fonte: 10_EDI_Statement.docx
    texto_sem_vinculos: >-
      Defendo ambientes de pesquisa e ensino em que diferenças de origem, identidade e trajetória não limitem a
      participação. Minha proposta é combinar materiais acessíveis, critérios transparentes de avaliação e mentoria
      atenta a estudantes de grupos sub-representados. Em {{INSTITUICAO}}, buscarei colaborar com {{UNIDADE_DE_INCLUSAO}}
      em ações compatíveis com as necessidades locais, incluindo apoio a pessoas LGBTQIA+ e estudantes de primeira
      geração universitária. A composição de redes de mentoria e oficinas será planejada com a comunidade e acompanhada
      por objetivos verificáveis.
  servico_e_lideranca:
    fonte: 11_Service_and_Leadership_Statement.docx
    texto_sem_vinculos: >-
      Entendo a liderança científica como responsabilidade compartilhada, presença na orientação e clareza nas decisões.
      Procuro apoiar estudantes e colaboradores com comunicação aberta, devolutivas úteis e espaço para criatividade,
      mantendo rigor metodológico e respeito. Em {{INSTITUICAO}}, junto a {{LABORATORIO}}, pretendo contribuir com
      revisão por pares, formação de pessoas e organização acadêmica conforme {{PRIORIDADES_DE_SERVICO}}. Valorizo
      um ambiente de trabalho acolhedor, com humor e compromisso com a qualidade.

# Personalizar os marcadores antes do envio; sem credenciais ou métricas infladas.
cartas_de_apresentacao:
  academica:
    fonte: 1_Cover_Letter.docx; identidade fornecida pelo autor; fatos de 0.Curriculum.docx
    texto_sem_vinculos: |-
      À comissão de seleção de {{INSTITUICAO}},

      Apresento minha candidatura a {{CARGO_ACADEMICO}} em {{DEPARTAMENTO}}. Sou Biólogo Computacional com 12+ anos de experiência, com foco em bioinformática multiômica, informática em saúde e desenvolvimento de métodos com machine learning e deep learning. Minha formação em Ciência da Computação e doutorado em Ciências da Natureza, na área de Bioinformática, sustentam uma trajetória que aproxima modelagem computacional e perguntas biológicas.

      Minha produção inclui estudos de footprinting, regulação gênica e arquitetura da cromatina. Pretendo desenvolver, em {{LABORATORIO}}, uma agenda de integração multiômica para investigar senescência, biomarcadores e hipóteses relevantes à descoberta de terapias. Vejo possibilidades de colaboração em {{LINHAS_DE_COLABORACAO}}, a serem discutidas com a equipe.

      Minha experiência em docência e orientação reforça meu interesse em contribuir para {{CURSOS_DE_INTERESSE}}, com aprendizagem ativa, formação interdisciplinar e acompanhamento de estudantes. Gostaria de conversar sobre como essa trajetória pode atender às prioridades de {{INSTITUICAO}}.

      Atenciosamente,
      Eduardo Gade Gusmão
      {{EMAIL_PREFERIDO}} | {{DATA_CARTA}}
  industria:
    fonte: Redação nova baseada na identidade solicitada; experiência industrial adicional ainda não preenchida
    texto_sem_vinculos: |-
      À equipe de recrutamento de {{INSTITUICAO}},

      Apresento minha candidatura a {{CARGO_INDUSTRIA}}. Sou Biólogo Computacional com 12+ anos de experiência em bioinformática multiômica, informática em saúde e P&D em descoberta de fármacos e terapias. Minha especialidade é desenvolver métodos com machine learning e deep learning para transformar dados biológicos em análises e hipóteses de pesquisa.

      Tenho interesse em contribuir com {{EQUIPE}} na integração de dados, avaliação de modelos e investigação de mecanismos biológicos relevantes a {{DESAFIO_DA_EMPRESA}}. Minha atuação combina pesquisa de biotecnologia multiômica com ciência, análise e engenharia de dados para biologia computacional. Como exemplo pertinente à vaga, apresentarei {{EXEMPLO_COM_EVIDENCIA}}, com escopo e resultados documentados.

      Gostaria de discutir como posso apoiar os objetivos de {{INSTITUICAO}} e colaborar com equipes científicas e tecnológicas no desenvolvimento de soluções para biologia e saúde.

      Atenciosamente,
      Eduardo Gade Gusmão
      {{EMAIL_PREFERIDO}} | {{DATA_CARTA}}

# Registros históricos para revisão privada; não foram contatadas referências.
referencias:
  criterio: Vínculos descritos historicamente pela fonte principal. Confirmar contatos e autorização antes de incluí-los
    em candidatura.
  pessoas:
    - id: ref_1
      nome: Prof. Dr. Ivan G. Costa
      relacao_historica: Supervisor “de facto” do Doutoramento do candidato
      instituicao_historica: RWTH University Hospital, Aachen University Medical School, Aachen, Alemanha.
      email_historico: ivan.costa@rwth-aachen-uni.de
      contato_atual_e_autorizacao: '{{CONFIRMAR_REFERENCIA_1}}'
      modelo_sem_vinculos: Prof. Dr. Ivan G. Costa — {{RELACAO_PROFISSIONAL}}, {{INSTITUICAO}}, {{LABORATORIO}},
        {{CIDADE}}, {{PAIS}}; {{EMAIL_REFERENCIA}}.
    - id: ref_2
      nome: Prof. Dr. Xiaole Shirley Liu
      relacao_historica: Supervisora do Pós-Doutorado na Universidade de Harvard
      instituicao_historica: Dana-Farber Cancer Institute, Harvard School of Public Health, Boston, MA, E.U.A.
      email_historico: xiaole.liu@harvard-dana.org
      contato_atual_e_autorizacao: '{{CONFIRMAR_REFERENCIA_2}}'
      modelo_sem_vinculos: Prof. Dr. Xiaole Shirley Liu — {{RELACAO_PROFISSIONAL}}, {{INSTITUICAO}}, {{LABORATORIO}},
        {{CIDADE}}, {{PAIS}}; {{EMAIL_REFERENCIA}}.
    - id: ref_3
      nome: Prof. Dr. Argyris Papantonis
      relacao_historica: 'Supervisor dos Pós-doutorados nas: Universidade de Colônia e Universidade de Göttingen'
      instituicao_historica: Georg-August Universität Göttingen, Göttingen, Alemanha.
      email_historico: argyris.papantonis@uniklinik-goettingen.de
      contato_atual_e_autorizacao: '{{CONFIRMAR_REFERENCIA_3}}'
      modelo_sem_vinculos: Prof. Dr. Argyris Papantonis — {{RELACAO_PROFISSIONAL}}, {{INSTITUICAO}}, {{LABORATORIO}},
        {{CIDADE}}, {{PAIS}}; {{EMAIL_REFERENCIA}}.
    - id: ref_4
      nome: Prof. Dr. Laura Elo
      relacao_historica: Supervisora do Pós-Doutorado na Universidade de Turku
      instituicao_historica: University of Turku, Turku, Finlândia.
      email_historico: laura.elo@turku-biosciences.org
      contato_atual_e_autorizacao: '{{CONFIRMAR_REFERENCIA_4}}'
      modelo_sem_vinculos: Prof. Dr. Laura Elo — {{RELACAO_PROFISSIONAL}}, {{INSTITUICAO}}, {{LABORATORIO}}, {{CIDADE}},
        {{PAIS}}; {{EMAIL_REFERENCIA}}.
    - id: ref_5
      nome: Prof. Dr. MD Martin Zenke
      relacao_historica: Co-supervisor “Biológico” do Doutoramento do candidato
      instituicao_historica: Aachen University Medical School, Aachen, Alemanha.
      email_historico: martin.zenke@rwth-aachen-uni.de
      contato_atual_e_autorizacao: '{{CONFIRMAR_REFERENCIA_5}}'
      modelo_sem_vinculos: Prof. Dr. MD Martin Zenke — {{RELACAO_PROFISSIONAL}}, {{INSTITUICAO}}, {{LABORATORIO}},
        {{CIDADE}}, {{PAIS}}; {{EMAIL_REFERENCIA}}.
    - id: ref_6
      nome: Prof. Dr. Clifford Meyer
      relacao_historica: Co-supervisor de Pós-Doutorado na Universidade de Harvard
      instituicao_historica: Dana-Farber Cancer Institute, Harvard School of Public Health, Boston, MA, U.S.A.
      email_historico: cliff.meyer@harvard-dana.org
      contato_atual_e_autorizacao: '{{CONFIRMAR_REFERENCIA_6}}'
      modelo_sem_vinculos: Prof. Dr. Clifford Meyer — {{RELACAO_PROFISSIONAL}}, {{INSTITUICAO}}, {{LABORATORIO}},
        {{CIDADE}}, {{PAIS}}; {{EMAIL_REFERENCIA}}.
    - id: ref_7
      nome: Prof. Dr. MD Riitta Lahesmaa
      relacao_historica: Co-supervisora de Pós-Doutorado na Universidade de Turku
      instituicao_historica: Turku University, Turku, Finland.
      email_historico: riitta.lahesmaa@turku-biosciences.org
      contato_atual_e_autorizacao: '{{CONFIRMAR_REFERENCIA_7}}'
      modelo_sem_vinculos: Prof. Dr. MD Riitta Lahesmaa — {{RELACAO_PROFISSIONAL}}, {{INSTITUICAO}}, {{LABORATORIO}},
        {{CIDADE}}, {{PAIS}}; {{EMAIL_REFERENCIA}}.
    - id: ref_8
      nome: Prof. Dr. MD Dimitri Frischmann
      relacao_historica: Supervisor do candidato na Universidade Técnica de Munique
      instituicao_historica: Technical University of Munich, Munich, Germany.
      email_historico: dimitri.frischmann@tum-sls.de
      contato_atual_e_autorizacao: '{{CONFIRMAR_REFERENCIA_8}}'
      modelo_sem_vinculos: Prof. Dr. MD Dimitri Frischmann — {{RELACAO_PROFISSIONAL}}, {{INSTITUICAO}}, {{LABORATORIO}},
        {{CIDADE}}, {{PAIS}}; {{EMAIL_REFERENCIA}}.

# Cobertura futura; tópicos sugeridos não afirmam realizações.
topicos_master_sugeridos:
  - Projetos de pesquisa com contribuição individual, período, financiamento e resultados verificáveis
  - Portfólio industrial com problema, método, entrega, impacto e evidência
  - Patentes, propriedade intelectual, licenciamento e transferência de tecnologia
  - Software, versões, licenças, manutenção e contribuições de código aberto
  - Conjuntos de dados, protocolos e reprodutibilidade
  - Ensaios, estudos clínicos e participação em consórcios com autoria comprovada
  - Preprints, manuscritos submetidos, capítulos, livros e traduções
  - Bolsas, habilitação, livre-docência e distinções mediante documentação
  - Sociedades científicas, comitês e organização de eventos
  - Avaliações docentes e resultados de mentoria documentados
  - Certificações profissionais e formação continuada
  - Divulgação científica, extensão, voluntariado e iniciativas de inclusão
  - Idiomas com nível e certificação
  - Disponibilidade, mobilidade e preferências de trabalho
  - Seleções de realizações para CV industrial de 1–2 páginas e CV acadêmico
  - Identificadores Lattes, ORCID e demais perfis atualizados
  - Bibliometria datada e critérios de contagem
  - Anexos comprobatórios e controle de versões
  - Produção literária e interesses, em seção opcional
  - Histórico de consentimento e divulgação de contatos de referências

# TODOs consolidados. Cada marcador de dados/modelos aparece nesta lista.
placeholders_pendentes:
  - marcadores:
      - '{{TELEFONE_ATUAL}}'
    contexto: Contato
    fonte: 1_Cover_Letter.docx; 2_Curriculum.docx
    motivo: Telefone histórico +55 81 9 8105-2040; confirmar atualidade.
  - marcadores:
      - '{{ORCID_CONFIRMADO}}'
    contexto: Contato
    fonte: 2_Curriculum.docx
    motivo: 'Candidato presente apenas na fonte exagerada: 0000-0001-7461-1443.'
  - marcadores:
      - '{{URL_GITHUB_CONFIRMADA}}'
    contexto: Contato
    fonte: 2_Curriculum.docx
    motivo: 'Hiperlink da fonte secundária: https://github.com/eggduzao; confirmar perfil preferido.'
  - marcadores:
      - '{{FORMACAO_3_FIM}}'
    contexto: Correção de data
    fonte: 0.Curriculum.docx
    motivo: 'Data impossível registrada na fonte: 31/02/2011. Não corrigida por inferência.'
  - marcadores:
      - '{{EXP_1_FIM}}'
      - '{{EXP_2_FIM}}'
      - '{{EXP_5_FIM}}'
      - '{{3_2_1_FIM}}'
      - '{{3_2_2_FIM}}'
      - '{{3_2_3_FIM}}'
      - '{{3_2_4_FIM}}'
      - '{{3_1_1_FIM}}'
      - '{{7_3_1_FIM}}'
      - '{{7_3_2_FIM}}'
      - '{{7_3_3_FIM}}'
      - '{{4_5_1_FIM}}'
    contexto: Término ou continuidade do vínculo
    fonte: 0.Curriculum.docx
    motivo: Atual refere-se ao início de 2025; confirmar situação em 2026.
  - marcadores:
      - '{{RECONCILIAR_METRICAS}}'
    contexto: Publicações
    fonte: 0.Curriculum.docx
    motivo: A fonte declara oito primeiras/co-primeiras autorias, mas os marcadores da lista precisam ser reconciliados;
      não recalcular impacto ou tratá-lo como qualidade individual.
  - marcadores:
      - '{{3_2_11_FIM}}'
    contexto: Correção de data
    fonte: 0.Curriculum.docx
    motivo: 'Data impossível registrada na fonte: 31/06/2022. Não corrigida por inferência.'
  - marcadores:
      - '{{6_3_FIM}}'
    contexto: Correção de data
    fonte: 0.Curriculum.docx
    motivo: 'Data impossível registrada na fonte: 31/04/2021. Não corrigida por inferência.'
  - marcadores:
      - '{{VALIDAR_CREDENCIAIS_ADICIONAIS}}'
    contexto: Formação e honrarias
    fonte: CV.yaml; 1_Cover_Letter.docx; 2_Curriculum.docx; 5_Awards_and_Honors.docx
    motivo: Doutorado em Harvard, Summa Cum Laude e Venia Docendi não constam na formação primária. Datas conflitantes
      das demais formações foram substituídas pelas da fonte principal.
  - marcadores:
      - '{{VALIDAR_TOTAIS_E_CONSORCIOS}}'
    contexto: Produção e financiamento
    fonte: 1_Cover_Letter.docx; 3_List_of_Publications.docx; 4_Grants_and_Funding.docx
    motivo: Não incorporar mais de 60 artigos, 35.000 citações, US$ 27,85 milhões ou publicações de consórcios sem
      comprovação. O inventário primário tem 19 artigos e 3 trabalhos completos em anais.
  - marcadores:
      - '{{VALIDAR_PREMIOS_ADICIONAIS}}'
    contexto: Honrarias
    fonte: 5_Awards_and_Honors.docx
    motivo: Prêmios, academias, posições e valores adicionais ausentes na fonte primária não foram incorporados.
  - marcadores:
      - '{{RECONCILIAR_ORIENTACOES}}'
    contexto: Mentoria
    fonte: 7_Mentorship.docx; 9_Teaching_Statement.docx
    motivo: A fonte primária lista 10 orientações de 7 pessoas; não adotar 11 alunos ou aproximadamente 150 supervisões
      indiretas.
  - marcadores:
      - '{{RECONCILIAR_DOCENCIA}}'
    contexto: Docência
    fonte: 6_Teaching_Experience.docx; 9_Teaching_Statement.docx
    motivo: Manter as 19 atividades da fonte primária; cargas, notas de avaliação, disciplinas e períodos secundários
      não comprovam acréscimos. Monitoria IF673 informa um semestre em intervalo de 2007 a 2008.
  - marcadores:
      - '{{CONFIRMAR_ATIVIDADES_EDI}}'
    contexto: Serviço
    fonte: 10_EDI_Statement.docx; 11_Service_and_Leadership_Statement.docx
    motivo: Comitê, grupo LGBTQIA+, cursos de liderança e oficinas não corroborados na fonte primária; declarações
      foram redigidas como princípios e propostas.
  - marcadores:
      - '{{CORRIGIR_REFERENCIAS_CRUZADAS_PREMIOS}}'
    contexto: Honrarias
    fonte: 0.Curriculum.docx
    motivo: Prêmios de 09/11/2016 remetem a 4.1.13, título não coincidente com footprinting; confirmar artigo premiado.
  - marcadores:
      - '{{RECONCILIAR_DATAS_EVENTOS}}'
    contexto: Eventos
    fonte: 0.Curriculum.docx
    motivo: Palestra 4.4.3 em 09/12/2016 versus participação 7.5.9 em 12/12/2016; palestra 4.4.9 em 22/04/2013 versus
      evento 7.5.19 em 15–16/04/2013.
  - marcadores:
      - '{{VALIDAR_FORMACAO_COMPLEMENTAR}}'
    contexto: Cursos
    fonte: 0.Curriculum.docx
    motivo: Biossegurança registra 50h em um único dia; nota de Genetics and Evolution aparece como 97:5%. Preservados
      para revisão, sem correção por inferência.
  - marcadores:
      - '{{RECONCILIAR_REFERENCIAS}}'
    contexto: Referências
    fonte: 0.Curriculum.docx; 16_Contact_References.docx
    motivo: >-
      Saída de Xiaole Liu é registrada em fevereiro de 2022 na fonte primária e em 2000 na secundária. Relações
      com Laura Elo, Riitta Lahesmaa e Dimitri Frischmann divergem; prevalece a fonte primária. Contatos atuais
      não verificados.
  - marcadores:
      - '{{CONFIRMAR_BIBLIOGRAFIA}}'
    contexto: Publicações
    fonte: 0.Curriculum.docx
    motivo: Preservadas grafias e anos da fonte; revisar autoria de 4.1.2 e 4.1.10, ano de 4.1.15 e eventuais erros
      de digitação. Não corrigidos com material exagerado.
  - marcadores:
      - '{{DETALHAR_CONSULTORIAS}}'
    contexto: Indústria
    fonte: 0.Curriculum.docx
    motivo: A fonte primária registra BioNTech SE e Bayer AG apesar da premissa de ausência de input industrial.
      Mantidas como consultorias documentadas, separadas dos stubs de emprego industrial.
  - marcadores:
      - '{{AVALIACAO_ILIA_DOUTORADO}}'
      - '{{CARGO_ACADEMICO}}'
      - '{{CARGO_INDUSTRIA}}'
      - '{{CERTIFICACAO}}'
      - '{{CIDADE}}'
      - '{{COMPETENCIA_INDUSTRIA}}'
      - '{{CONHECIMENTOS_BASICOS_CONFIRMADOS}}'
      - '{{CURSOS_DE_INTERESSE}}'
      - '{{CURSO}}'
      - '{{DATA_CARTA}}'
      - '{{DATA_CERTIFICACAO}}'
      - '{{DATA_METRICAS}}'
      - '{{DEPARTAMENTO}}'
      - '{{DESAFIO_DA_EMPRESA}}'
      - '{{EMAIL_PREFERIDO}}'
      - '{{EMAIL_REFERENCIA}}'
      - '{{EQUIPE}}'
      - '{{EVENTO}}'
      - '{{EVIDENCIA_COMPETENCIA_INDUSTRIA}}'
      - '{{EXEMPLO_COM_EVIDENCIA}}'
      - '{{FIM_INDUSTRIA}}'
      - '{{INICIO_INDUSTRIA}}'
      - '{{INSTITUICAO}}'
      - '{{LABORATORIO}}'
      - '{{LINHAS_DE_COLABORACAO}}'
      - '{{NIVEIS_E_EVIDENCIAS_TECNICAS}}'
      - '{{NIVEL_COMPETENCIA_INDUSTRIA}}'
      - '{{ORIENTADOR}}'
      - '{{PAIS}}'
      - '{{PRIORIDADES_DE_SERVICO}}'
      - '{{PUBLICO_ALVO}}'
      - '{{RELACAO_PROFISSIONAL}}'
      - '{{RESPONSABILIDADES_INDUSTRIA}}'
      - '{{RESULTADOS_INDUSTRIA_COM_EVIDENCIA}}'
      - '{{TECNOLOGIAS_INDUSTRIA}}'
      - '{{TEMA}}'
      - '{{TITULO_TRABALHO_1}}'
      - '{{TITULO_TRABALHO_2}}'
      - '{{TITULO_TRABALHO_3}}'
      - '{{TITULO_TRABALHO_OU_PROJETO}}'
      - '{{UNIDADE_DE_INCLUSAO}}'
      - '{{URL_BLOOM}}'
      - '{{URL_CREDENCIAL}}'
      - '{{URL_HINT}}'
      - '{{URL_LATTES}}'
      - '{{URL_LINKEDIN}}'
      - '{{URL_RGT}}'
      - '{{URL_SITE}}'
    contexto: Campos e modelos reutilizáveis
    fonte: Solicitação do autor e fontes locais
    motivo: Dado ausente, nível a confirmar ou personalização do modelo; não representa fato comprovado.
  - marcadores:
      - '{{CARGA_HORARIA_3_2_10}}'
      - '{{CARGA_HORARIA_3_2_11}}'
      - '{{CARGA_HORARIA_3_2_12}}'
      - '{{CARGA_HORARIA_3_2_13}}'
      - '{{CARGA_HORARIA_3_2_14}}'
      - '{{CARGA_HORARIA_3_2_15}}'
      - '{{CARGA_HORARIA_3_2_16}}'
      - '{{CARGA_HORARIA_3_2_17}}'
      - '{{CARGA_HORARIA_3_2_18}}'
      - '{{CARGA_HORARIA_3_2_19}}'
      - '{{CARGA_HORARIA_3_2_1}}'
      - '{{CARGA_HORARIA_3_2_2}}'
      - '{{CARGA_HORARIA_3_2_3}}'
      - '{{CARGA_HORARIA_3_2_4}}'
      - '{{CARGA_HORARIA_3_2_5}}'
      - '{{CARGA_HORARIA_3_2_6}}'
      - '{{CARGA_HORARIA_3_2_7}}'
      - '{{CARGA_HORARIA_3_2_8}}'
      - '{{CARGA_HORARIA_3_2_9}}'
    contexto: experiencia_docente
    fonte: 0.Curriculum.docx
    motivo: Carga horária ausente na fonte primária; não transportar valores da versão exagerada.
  - marcadores:
      - '{{CONFIRMAR_REFERENCIA_1}}'
      - '{{CONFIRMAR_REFERENCIA_2}}'
      - '{{CONFIRMAR_REFERENCIA_3}}'
      - '{{CONFIRMAR_REFERENCIA_4}}'
      - '{{CONFIRMAR_REFERENCIA_5}}'
      - '{{CONFIRMAR_REFERENCIA_6}}'
      - '{{CONFIRMAR_REFERENCIA_7}}'
      - '{{CONFIRMAR_REFERENCIA_8}}'
    contexto: referencias
    fonte: 0.Curriculum.docx; 16_Contact_References.docx
    motivo: Confirmar contato atual e autorização de uso.
  - marcadores:
      - '{{IDENTIFICADOR_4_1_12}}'
      - '{{IDENTIFICADOR_4_1_1}}'
      - '{{IDENTIFICADOR_4_1_7}}'
      - '{{IDENTIFICADOR_4_1_9}}'
      - '{{IDENTIFICADOR_4_2_1}}'
      - '{{IDENTIFICADOR_4_2_2}}'
      - '{{IDENTIFICADOR_4_2_3}}'
      - '{{IDENTIFICADOR_4_3_10}}'
      - '{{IDENTIFICADOR_4_3_11}}'
      - '{{IDENTIFICADOR_4_3_12}}'
      - '{{IDENTIFICADOR_4_3_13}}'
      - '{{IDENTIFICADOR_4_3_1}}'
      - '{{IDENTIFICADOR_4_3_2}}'
      - '{{IDENTIFICADOR_4_3_3}}'
      - '{{IDENTIFICADOR_4_3_4}}'
      - '{{IDENTIFICADOR_4_3_5}}'
      - '{{IDENTIFICADOR_4_3_6}}'
      - '{{IDENTIFICADOR_4_3_7}}'
      - '{{IDENTIFICADOR_4_3_8}}'
      - '{{IDENTIFICADOR_4_3_9}}'
    contexto: publicacoes
    fonte: 0.Curriculum.docx; 8_Research_Statement.docx
    motivo: DOI/URL não informado na lista primária; referências do statement não foram atribuídas sem conferência
      individual.
  - marcadores:
      - '{{PROFICIENCIA_ALEMAO}}'
      - '{{PROFICIENCIA_ESPANHOL}}'
      - '{{PROFICIENCIA_INGLES}}'
      - '{{PROFICIENCIA_PORTUGUES}}'
    contexto: identidade_profissional.idiomas
    fonte: CV.yaml; 2_Curriculum.docx
    motivo: Idiomas listados; níveis da fonte exagerada aguardam confirmação.
  - marcadores:
      - '{{RESPONSABILIDADES_EXP_10}}'
      - '{{RESPONSABILIDADES_EXP_11}}'
      - '{{RESPONSABILIDADES_EXP_12}}'
      - '{{RESPONSABILIDADES_EXP_13}}'
      - '{{RESPONSABILIDADES_EXP_14}}'
      - '{{RESPONSABILIDADES_EXP_1}}'
      - '{{RESPONSABILIDADES_EXP_2}}'
      - '{{RESPONSABILIDADES_EXP_3}}'
      - '{{RESPONSABILIDADES_EXP_4}}'
      - '{{RESPONSABILIDADES_EXP_5}}'
      - '{{RESPONSABILIDADES_EXP_6}}'
      - '{{RESPONSABILIDADES_EXP_7}}'
      - '{{RESPONSABILIDADES_EXP_8}}'
      - '{{RESPONSABILIDADES_EXP_9}}'
      - '{{TECNOLOGIAS_EXP_10}}'
      - '{{TECNOLOGIAS_EXP_11}}'
      - '{{TECNOLOGIAS_EXP_12}}'
      - '{{TECNOLOGIAS_EXP_13}}'
      - '{{TECNOLOGIAS_EXP_14}}'
      - '{{TECNOLOGIAS_EXP_1}}'
      - '{{TECNOLOGIAS_EXP_2}}'
      - '{{TECNOLOGIAS_EXP_3}}'
      - '{{TECNOLOGIAS_EXP_4}}'
      - '{{TECNOLOGIAS_EXP_5}}'
      - '{{TECNOLOGIAS_EXP_6}}'
      - '{{TECNOLOGIAS_EXP_7}}'
      - '{{TECNOLOGIAS_EXP_8}}'
      - '{{TECNOLOGIAS_EXP_9}}'
    contexto: experiencia_profissional
    fonte: 0.Curriculum.docx
    motivo: Fonte primária informa cargo, departamento e datas, mas não detalha atribuições ou tecnologias por vínculo.
