import { DictionaryEntry } from './types';

export const INITIAL_ENTRIES: DictionaryEntry[] = [
  {
    id: "dep-lao",
    color: "pink",
    vn: "Dép lào",
    en: "flip-flops",
    pos: "noun",
    ipa: "/flip-flops/",
    definition: "Một loại dép xỏ ngón đơn giản, thường làm bằng cao su hoặc nhựa plastic. Tên gọi này xuất phát từ việc những đôi dép này được nhập khẩu từ Lào vào Việt Nam trong những thập niên trước.",
    definition_en: "A type of open-toed sandal typically made of rubber, featuring a Y-shaped strap that passes between the first and second toes.",
    image_url: "https://images.unsplash.com/photo-1582966772680-860e372bb558?q=80&w=800&auto=format&fit=crop",
    tags: ["dép cao su", "giày sandal", "đôi", "summeressentials", "vietnamculture", "streetstyle"],
    status: "published",
    created_by: "Chunker",
    updated_at: "2026-06-04T10:23:44Z",
    examples: [
      {
        id: "ex-dl-1",
        type: "normal",
        text_en: "Don't forget to bring a pair of flip-flops when going to the beach.",
        text_vn: "Đừng quên mang theo một đôi dép lào khi đi biển nhé."
      },
      {
        id: "ex-dl-2",
        type: "normal",
        text_en: "In Vietnam, flip-flops are extremely popular and convenient items.",
        text_vn: "Ở Việt Nam, dép lào là món đồ cực kỳ phổ biến và tiện lợi."
      },
      {
        id: "ex-dl-cm-1",
        type: "codemix",
        text_en: "Hôm nay trời nóng quá, chắc tui phải mang 'flip-flop' cho mát.",
        text_vn: "Today is so hot, I probably must wear flip-flops for coolness."
      },
      {
        id: "ex-dl-cm-2",
        type: "codemix",
        text_en: "Đôi 'flip-flop' này tui mua ở Thái Lan, mang êm chân cực kỳ.",
        text_vn: "I bought these flip-flops in Thailand, they are extremely comfortable to wear."
      },
      {
        id: "ex-dl-cm-3",
        type: "codemix",
        text_en: "Bạn nhớ mang theo 'flip-flop' khi đi biển để đi lại cho tiện nhé.",
        text_vn: "Remember to bring flip-flops when going to the beach for convenient moving."
      }
    ],
    related_terms: [
      {
        term_en: "a pair of flip-flops",
        term_vn: "một đôi dép lào",
        example_en: "She kicked off her flip-flops at the door.",
        example_vn: "Cô ấy đá đôi dép lào ra ở cửa."
      },
      {
        term_en: "rubber slippers",
        term_vn: "dép cao su",
        example_en: "My rubber slippers broke on the way home.",
        example_vn: "Dép cao su của tôi bị đứt trên đường về."
      },
      {
        term_en: "Dép lê",
        term_vn: "Sandals/Slides"
      },
      {
        term_en: "Giày san-đan",
        term_vn: "Sandals"
      },
      {
        term_en: "Đi chân đất",
        term_vn: "Barefoot"
      }
    ],
    teacher_audios: [
      {
        id: "ta-dl-1",
        teacher_name: "Chunker",
        audio_url: "preset-chunker-explain",
        duration_sec: 45,
        created_at: "2026-06-04T10:23:44Z"
      }
    ],
    note_text: "Lưu ý cách phát âm chữ 'Lào' trong tiếng Anh hay dùng từ 'flip-flops' (luôn ở dạng số nhiều). Tránh nhầm lẫn với 'slides' hay 'sandals' có quai hậu nhé!"
  },
  {
    id: "cut-story-short",
    color: "red",
    vn: "Tóm lại là / Nói ngắn gọn thì",
    en: "To cut a long story short",
    pos: "phrase/idiom",
    ipa: "/tə kʌt ə lɒŋ ˈstɔːri ʃɔːt/",
    definition: "Dùng để tóm tắt nhanh câu chuyện dài, bỏ qua các chi tiết phụ để đi thẳng vào kết quả chính hoặc kết luận.",
    definition_en: "Used when you are explaining what happened in a few words, skipping details to get straight to the main point.",
    image_url: "https://images.unsplash.com/photo-1516414447565-b14be0adf13e?q=80&w=800&auto=format&fit=crop",
    tags: ["idioms", "speaking", "summarize", "everydayvocabulary"],
    status: "published",
    created_by: "Chunker",
    updated_at: "2026-06-04T10:23:44Z",
    examples: [
      {
        id: "ex-css-1",
        type: "normal",
        text_en: "To cut a long story short, we decided to sell the house.",
        text_vn: "Tóm lại là / Nói ngắn gọn thì chúng tôi đã quyết định bán căn nhà."
      },
      {
        id: "ex-css-2",
        type: "normal",
        text_en: "To cut a long story short, they ended up getting married in Vegas.",
        text_vn: "Nói ngắn gọn thì sau cùng họ đã cưới nhau ở Las Vegas."
      },
      {
        id: "ex-css-cm-1",
        type: "codemix",
        text_en: "Thôi thì 'to cut a long story short', tui rớt môn đó mất rồi.",
        text_vn: "To cut a long story short, I ended up failing that course."
      }
    ],
    related_terms: [
      {
        term_en: "In brief",
        term_vn: "Nói tóm lại"
      },
      {
        term_en: "Long story short",
        term_vn: "Bản rút gọn (khẩu ngữ)"
      }
    ],
    note_text: "Đây là một Idiom vô cùng thông dụng trong đời sống và giao tiếp hàng ngày."
  },
  {
    id: "in-the-long-run",
    color: "red",
    vn: "Về lâu về dài",
    en: "In the long run",
    pos: "phrase/idiom",
    ipa: "/ɪn ðə lɒŋ rʌn/",
    definition: "Sự việc sẽ xảy ra hoặc có kết quả sau một thời gian dài trong tương lai, thay vì ngay lập tức.",
    definition_en: "Over a relatively long period of time; in the end or ultimate career of events.",
    image_url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=800&auto=format&fit=crop",
    tags: ["idioms", "future", "business", "planning"],
    status: "published",
    created_by: "Thầy Minh Quang",
    updated_at: "2026-06-04T10:23:44Z",
    examples: [
      {
        id: "ex-ilr-1",
        type: "normal",
        text_en: "This investment will be highly profitable in the long run.",
        text_vn: "Khoản đầu tư này sẽ mang lại lợi nhuận cao về lâu về dài."
      },
      {
        id: "ex-ilr-cm-1",
        type: "codemix",
        text_en: "Chăm sóc sức khỏe ngay bây giờ sẽ có lợi 'in the long run'.",
        text_vn: "Taking care of your health now is beneficial in the long run."
      }
    ],
    related_terms: [
      {
        term_en: "Eventually",
        term_vn: "Cuối cùng thì"
      },
      {
        term_en: "Over time",
        term_vn: "Qua thời gian"
      }
    ]
  },
  {
    id: "off-the-top-head",
    color: "red",
    vn: "Theo những gì tôi nhớ được ngay lúc này",
    en: "Off the top of my head",
    pos: "phrase/idiom",
    ipa: "/ɒf ðə tɒp ɒv maɪ hɛd/",
    definition: "Nói ra một thông tin từ trí nhớ ngay lập tức mà không cần suy nghĩ lâu hay tra cứu số liệu cụ thể.",
    definition_en: "From memory, without deeply researching or checking records, spontaneously.",
    image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop",
    tags: ["idioms", "memory", "speaking"],
    status: "published",
    created_by: "Chunker",
    updated_at: "2026-06-04T10:23:44Z",
    examples: [
      {
        id: "ex-oth-1",
        type: "normal",
        text_en: "Off the top of my head, I think the meeting is at 2 PM.",
        text_vn: "Theo tôi nhớ ngay lúc này thì cuộc họp diễn ra lúc 2 giờ chiều."
      },
      {
        id: "ex-oth-cm-1",
        type: "codemix",
        text_en: "Nếu hỏi ngay 'off the top of my head' thì tui nhớ chỉ có 3 người tham dự.",
        text_vn: "If asked spontaneously, I can only recall three attendees."
      }
    ],
    related_terms: [
      {
        term_en: "At first guess",
        term_vn: "Đoán chừng ban đầu"
      }
    ]
  },
  {
    id: "bear-in-mind",
    color: "blue",
    vn: "Hãy nhớ rằng / Lưu ý rằng",
    en: "Bear in mind",
    pos: "sentence frame",
    ipa: "/beər ɪn maɪnd/",
    definition: "Khung câu dùng để dặn dò hoặc lưu ý ai đó về một thông tin quan trọng cần được cân nhắc kỹ lưỡng khi đưa ra quyết định.",
    definition_en: "To remember or keep something in consideration when planning or making a judgment.",
    image_url: "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=800&auto=format&fit=crop",
    tags: ["sentenceframes", "caution", "instruction"],
    status: "published",
    created_by: "Thầy Minh Quang",
    updated_at: "2026-06-04T10:23:44Z",
    examples: [
      {
        id: "ex-bim-1",
        type: "normal",
        text_en: "Bear in mind that the office is closed on weekends.",
        text_vn: "Hãy nhớ rằng/Lưu ý rằng văn phòng đóng cửa vào cuối tuần."
      },
      {
        id: "ex-bim-2",
        type: "normal",
        text_en: "You should bear in mind that prices can fluctuate.",
        text_vn: "Bạn nên giữ trong lòng lưu ý rằng giá cả có thể biến động."
      },
      {
        id: "ex-bim-cm-1",
        type: "codemix",
        text_en: "Sắp thi rồi, mọi người nhớ 'bear in mind' lời dặn của thầy nha.",
        text_vn: "The exam is coming, everyone should keep the teacher's advice in mind."
      }
    ],
    related_terms: [
      {
        term_en: "Keep in mind",
        term_vn: "Ghi nhớ trong tâm trí"
      },
      {
        term_en: "Take into account",
        term_vn: "Cân nhắc tới"
      }
    ]
  },
  {
    id: "to-be-honest",
    color: "blue",
    vn: "Thành thật mà nói với bạn",
    en: "To be honest with you",
    pos: "sentence frame",
    ipa: "/tuː biː ˈɒnɪst wɪð juː/",
    definition: "Nhóm từ/khung câu dùng để bắt đầu chia sẻ ý kiến chân thành của bản thân, thường là khi chuẩn bị đưa ra phản hồi không mấy thuận tai hay lời khuyên trung thực.",
    definition_en: "A transition frame used to signal sincere, absolute truth, often preceding an unpopular opinion or feedback.",
    image_url: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop",
    tags: ["sentenceframes", "honesty", "speakingstyle", "communication"],
    status: "published",
    created_by: "Chunker",
    updated_at: "2026-06-04T10:23:44Z",
    examples: [
      {
        id: "ex-tbh-1",
        type: "normal",
        text_en: "To be honest with you, I don't think this plan will work.",
        text_vn: "Thành thật mà nói với bạn, tôi không nghĩ kế hoạch này sẽ khả thi."
      },
      {
        id: "ex-tbh-cm-1",
        type: "codemix",
        text_en: "Tụi mình nói chuyện 'to be honest with you' thì món ăn này quá mặn.",
        text_vn: "Speaking honestly with you, this dish is way too salty."
      }
    ],
    related_terms: [
      {
        term_en: "Frankly speaking",
        term_vn: "Thẳng thắn mà nói"
      },
      {
        term_en: "In all honesty",
        term_vn: "Với tất cả độ chân thành"
      }
    ]
  },
  {
    id: "goes-without-saying",
    color: "red",
    vn: "Hiển nhiên là / Không cần phải nói",
    en: "It goes without saying",
    pos: "phrase/idiom",
    ipa: "/ɪt ɡəʊz wɪˈðaʊt ˈseɪ.ɪŋ/",
    definition: "Cụm từ nhấn mạnh một việc cực kỳ rõ ràng, ai ai cũng đồng tình và không cần thêm lời giải thích hay chứng minh nào nữa.",
    definition_en: "Something that is extremely clear, obvious, and universally agreed upon, needing no explicit mention.",
    image_url: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=800&auto=format&fit=crop",
    tags: ["idioms", "obvious", "conversational"],
    status: "published",
    created_by: "Chunker",
    updated_at: "2026-06-04T10:23:44Z",
    examples: [
      {
        id: "ex-gws-1",
        type: "normal",
        text_en: "It goes without saying that you need to work hard to succeed.",
        text_vn: "Hiển nhiên là bạn cần làm việc chăm chỉ để gặt hái thành công."
      },
      {
        id: "ex-gws-cm-1",
        type: "codemix",
        text_en: "Đã đi làm thì 'it goes without saying' là phải đúng giờ.",
        text_vn: "When working, it goes without saying that you must be punctual."
      }
    ],
    related_terms: [
      {
        term_en: "Needless to say",
        term_vn: "Không cần thiết phải nói thêm"
      },
      {
        term_en: "Obviously",
        term_vn: "Một cách rõ ràng"
      }
    ]
  },
  {
    id: "no-free-lunch",
    color: "red",
    vn: "Không có gì là miễn phí cả",
    en: "No such thing as a free lunch",
    pos: "phrase/idiom",
    ipa: "/nəʊ sʌtʃ θɪŋ æz ə friː lʌntʃ/",
    definition: "Nhắc nhở rằng trong đời sống không bao giờ có lợi ích nào có được một cách hoàn toàn dễ dàng hay cho không; mọi ưu đãi đều gắn liền với một nghĩa vụ hoặc giá phải trả âm thầm nào đó.",
    definition_en: "The idea that things that appear to be free always have a hidden cost or cost someone eventually.",
    image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
    tags: ["idioms", "truth", "business", "caution"],
    status: "published",
    created_by: "Thầy Minh Quang",
    updated_at: "2026-06-04T10:23:44Z",
    examples: [
      {
        id: "ex-nfl-1",
        type: "normal",
        text_en: "They offered a free trial, but there's no such thing as a free lunch; you have to provide credit card info.",
        text_vn: "Họ tặng bản dùng thử miễn phí, nhưng đời không ai cho không ai cái gì cả; bạn vẫn phải cung cấp thông tin thẻ tín dụng."
      },
      {
        id: "ex-nfl-cm-1",
        type: "codemix",
        text_en: "Mua 1 tặng 1 á? Coi chừng, 'there is no such thing as a free lunch' đâu nhé.",
        text_vn: "Buy 1 get 1 free? Watch out, there is no such thing as a free lunch."
      }
    ],
    related_terms: [
      {
        term_en: "Everything has a price",
        term_vn: "Mọi thứ đều có cái giá của nó"
      }
    ]
  },
  {
    id: "actually",
    color: "green",
    vn: "Thật ra là / Thực tế là",
    en: "Actually",
    pos: "gap filler",
    ipa: "/ˈæktʃuəli/",
    definition: "Từ nối câu, nối hội thoại dùng để đính chính nhẹ nhàng một thông tin, đưa ra chi tiết chính xác hoặc tạo khoảng nghỉ tự nhiên trong lúc nói.",
    definition_en: "A filler word used to gently clarify a point, correct a misconception, or buy time while planning the speech.",
    image_url: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=800&auto=format&fit=crop",
    tags: ["gapfillers", "transition", "speakingstyle"],
    status: "published",
    created_by: "Chunker",
    updated_at: "2026-06-04T10:23:44Z",
    examples: [
      {
        id: "ex-act-1",
        type: "normal",
        text_en: "Actually, I've already finished the report.",
        text_vn: "Thực ra là, tôi đã hoàn thành báo cáo rồi."
      },
      {
        id: "ex-act-cm-1",
        type: "codemix",
        text_en: "'Actually' thì tui thấy kế hoạch này cũng hay đấy chứ.",
        text_vn: "Actually, I think this plan is quite good too."
      }
    ],
    related_terms: [
      {
        term_en: "In fact",
        term_vn: "Thực chất là"
      },
      {
        term_en: "As a matter of fact",
        term_vn: "Như một thực tế hiển nhiên"
      }
    ]
  },
  {
    id: "you-know",
    color: "green",
    vn: "Bạn biết đấy / Kiểu như",
    en: "You know",
    pos: "gap filler",
    ipa: "/juː nəʊ/",
    definition: "Từ lấp khoảng trống cực kỳ quen thuộc để giữ kết nối câu chuyện với người nghe trong khi bản thân đang suy nghĩ tìm từ tiếp theo.",
    definition_en: "A ubiquitous conversation starter or gap-filler to maintain connection with the listener while planning thoughts.",
    image_url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop",
    tags: ["gapfillers", "natural", "speaking"],
    status: "published",
    created_by: "Chunker",
    updated_at: "2026-06-04T10:23:44Z",
    examples: [
      {
        id: "ex-yk-1",
        type: "normal",
        text_en: "It's just, you know, we haven't seen each other in years.",
        text_vn: "Chỉ là, bạn biết đấy, chúng ta đã không gặp nhau nhiều năm rồi."
      }
    ],
    related_terms: [
      {
        term_en: "Like",
        term_vn: "Giống như là (filler)"
      },
      {
        term_en: "You see",
        term_vn: "Bạn thấy đấy"
      }
    ]
  }
];
