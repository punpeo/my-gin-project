package model

// BarcodeItem 单个条形码
type BarcodeItem struct {
	Barcode string
}

// BarcodeGroup 型号分组：型号名称 + 该型号全部条形码集合
type BarcodeGroup struct {
	ModelName   string        // 型号名称，自动去除括号统一归类
	BarcodeList []BarcodeItem // 对应条码数组（自动去重）
}

// 全局预生成好的完整条码分组数据（已解析你全部文本，去重、合并括号型号）
var BarcodeData = []BarcodeGroup{
	{
		ModelName: "六代耳机",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330414"},
			{Barcode: "6977676161127"},
			{Barcode: "6977676160649"},
			{Barcode: "6977676160168"},
			{Barcode: "6977676160625"},
		},
	},
	{
		ModelName: "(六代耳机）",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330933"},
			{Barcode: "6977676160595"},
			{Barcode: "6976375330841"},
			{Barcode: "6976375330964"},
			{Barcode: "6976375331213"},
			{Barcode: "6976375331206"},
			{Barcode: "6976375331046"},
		},
	},
	{
		ModelName: "ASOYQD6高雅黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330148"},
		},
	},
	{
		ModelName: "G19黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330100"},
		},
	},
	{
		ModelName: "Pro4S",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330568"},
		},
	},
	{
		ModelName: "五代耳机",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330292"},
			{Barcode: "6976375330315"},
			{Barcode: "6977676160687"},
			{Barcode: "6977676160632"},
			{Barcode: "6977676160151"},
			{Barcode: "6977676160328"},
		},
	},
	{
		ModelName: "(五代耳机）",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330858"},
			{Barcode: "6976375331039"},
		},
	},
	{
		ModelName: "五金有线3.5",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330582"},
		},
	},
	{
		ModelName: "四代耳机",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330285"},
			{Barcode: "6976375330001"},
			{Barcode: "6976375330308"},
			{Barcode: "6977676160656"},
			{Barcode: "6977676160144"},
			{Barcode: "6977676160311"},
		},
	},
	{
		ModelName: "asoy新陶瓷3.5",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330612"},
		},
	},
	{
		ModelName: "asoy新陶瓷tc",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330605"},
		},
	},
	{
		ModelName: "M116黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161240"},
		},
	},
	{
		ModelName: "V21白",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161264"},
			{Barcode: "6977676160823"},
		},
	},
	{
		ModelName: "V21黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161257"},
			{Barcode: "6977676161066"},
		},
	},
	{
		ModelName: "BX-02挂脖耳机",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161189"},
		},
	},
	{
		ModelName: "SE10有线黑3.5",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161172"},
		},
	},
	{
		ModelName: "SE10有线黑tc",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161165"},
		},
	},
	{
		ModelName: "M100紫",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161233"},
		},
	},
	{
		ModelName: "M100黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161226"},
		},
	},
	{
		ModelName: "M91肤",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161219"},
			{Barcode: "6976375331060"},
		},
	},
	{
		ModelName: "M91黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161196"},
			{Barcode: "6976375331053"},
		},
	},
	{
		ModelName: "M91紫",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161202"},
			{Barcode: "6976375331107"},
		},
	},
	{
		ModelName: "B0KILINO骨传导X13",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161271"},
		},
	},
	{
		ModelName: "九代耳机",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330674"},
			{Barcode: "6976375330667"},
			{Barcode: "6976375330698"},
			{Barcode: "6976375330681"},
			{Barcode: "6976375330629"},
			{Barcode: "6976375330094"},
			{Barcode: "6976375330018"},
			{Barcode: "6977676160809"},
			{Barcode: "6977676160816"},
			{Barcode: "6977676160830"},
		},
	},
	{
		ModelName: "G19肤",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330117"},
		},
	},
	{
		ModelName: "10000M无线充",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330254"},
		},
	},
	{
		ModelName: "30W充电头",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330353"},
			{Barcode: "6977676160410"},
			{Barcode: "6977676160304"},
			{Barcode: "6976375330537"},
		},
	},
	{
		ModelName: "5000M无线充",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330247"},
		},
	},
	{
		ModelName: "C-C1米",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330322"},
			{Barcode: "6976375330810"},
			{Barcode: "6976375330742"},
			{Barcode: "6977676160892"},
			{Barcode: "6977676160380"},
			{Barcode: "6977676160335"},
			{Barcode: "6976375330544"},
		},
	},
	{
		ModelName: "C-C1.5米",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330339"},
		},
	},
	{
		ModelName: "C-C2米",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330346"},
			{Barcode: "6976375330827"},
			{Barcode: "6976375330759"},
			{Barcode: "6977676160908"},
			{Barcode: "6977676160397"},
			{Barcode: "6977676160342"},
			{Barcode: "6976375330551"},
		},
	},
	{
		ModelName: "asoy陶瓷黑tc",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330162"},
			{Barcode: "6976375330193"},
			{Barcode: "6976375330421"},
			{Barcode: "6976375330995"},
		},
	},
	{
		ModelName: "V18白",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330506"},
			{Barcode: "6977676160045"},
		},
	},
	{
		ModelName: "V18金",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330520"},
			{Barcode: "6977676160038"},
		},
	},
	{
		ModelName: "V18黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330513"},
			{Barcode: "6977676160021"},
		},
	},
	{
		ModelName: "V49白",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330476"},
			{Barcode: "6977676160014"},
		},
	},
	{
		ModelName: "V49黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330469"},
			{Barcode: "6977676160007"},
		},
	},
	{
		ModelName: "Y90黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330490"},
			{Barcode: "6977676160090"},
			{Barcode: "6977676160083"},
			{Barcode: "6977676161349"},
		},
	},
	{
		ModelName: "Y90白",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330483"},
			{Barcode: "6977676160076"},
			{Barcode: "6977676160069"},
		},
	},
	{
		ModelName: "PD2米",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330780"},
			{Barcode: "6976375330803"},
			{Barcode: "6977676160458"},
			{Barcode: "6976375330445"},
			{Barcode: "6977676160496"},
		},
	},
	{
		ModelName: "PD1米",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330773"},
			{Barcode: "6976375330797"},
			{Barcode: "6977676160441"},
			{Barcode: "6976375330438"},
			{Barcode: "6977676160489"},
		},
	},
	{
		ModelName: "45W充电头",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330766"},
			{Barcode: "6977676160915"},
			{Barcode: "6977676160403"},
			{Barcode: "6977676160359"},
		},
	},
	{
		ModelName: "asoy陶瓷白3.5",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330261"},
			{Barcode: "6976375331008"},
		},
	},
	{
		ModelName: "asoy陶瓷白tc",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330278"},
			{Barcode: "6976375331015"},
		},
	},
	{
		ModelName: "asoy陶瓷黑3.5",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330209"},
			{Barcode: "6976375330988"},
		},
	},
	{
		ModelName: "A118黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160571"},
		},
	},
	{
		ModelName: "K08黑骨传导",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160717"},
		},
	},
	{
		ModelName: "SNSY陶瓷白3.5",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160670"},
		},
	},
	{
		ModelName: "SNSY陶瓷黑3.5",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160236"},
		},
	},
	{
		ModelName: "SNSY陶瓷白tc",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160663"},
		},
	},
	{
		ModelName: "SNSY陶瓷黑tc",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160229"},
		},
	},
	{
		ModelName: "X13黑色骨传导",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160700"},
		},
	},
	{
		ModelName: "X21黑色骨传导",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160724"},
		},
	},
	{
		ModelName: "hifi转接头（新款）",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160885"},
		},
	},
	{
		ModelName: "M108紫",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160946"},
		},
	},
	{
		ModelName: "M108黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160540"},
		},
	},
	{
		ModelName: "睡眠耳机金",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160533"},
		},
	},
	{
		ModelName: "睡眠耳机黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160526"},
		},
	},
	{
		ModelName: "A118金",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160588"},
		},
	},
	{
		ModelName: "SNSY的M100紫",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161158"},
		},
	},
	{
		ModelName: "SNSY的M100黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161141"},
		},
	},
	{
		ModelName: "M149肤",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161073"},
		},
	},
	{
		ModelName: "M149黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161097"},
		},
	},
	{
		ModelName: "SNSY的Y63白",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161110"},
		},
	},
	{
		ModelName: "SNSY的Y63黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161103"},
		},
	},
	{
		ModelName: "M72肤",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330971"},
		},
	},
	{
		ModelName: "M89肤",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330896"},
			{Barcode: "6976375331176"},
		},
	},
	{
		ModelName: "M89黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330902"},
			{Barcode: "6976375331169"},
		},
	},
	{
		ModelName: "M120肤",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330872"},
		},
	},
	{
		ModelName: "M120黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330889"},
		},
	},
	{
		ModelName: "M139黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330865"},
			{Barcode: "6976375330711"},
		},
	},
	{
		ModelName: "GL8银",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330926"},
			{Barcode: "6976375330735"},
		},
	},
	{
		ModelName: "M159黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330919"},
			{Barcode: "6976375330728"},
		},
	},
	{
		ModelName: "asoy-睡眠耳塞白",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375331121"},
		},
	},
	{
		ModelName: "asoy-睡眠耳塞黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375331114"},
		},
	},
	{
		ModelName: "M97紫",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375331077"},
			{Barcode: "6976375331145"},
		},
	},
	{
		ModelName: "M97肤",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375331091"},
			{Barcode: "6976375331152"},
		},
	},
	{
		ModelName: "M97黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375331084"},
			{Barcode: "6976375331138"},
		},
	},
	{
		ModelName: "M185黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161318"},
		},
	},
	{
		ModelName: "M185肤",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161325"},
		},
	},
	{
		ModelName: "K002灰",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161332"},
		},
	},
	{
		ModelName: "k12黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676161356"},
		},
	},
	{
		ModelName: "K002白",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160977"},
		},
	},
	{
		ModelName: "K003黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160960"},
		},
	},
	{
		ModelName: "K007白",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160953"},
		},
	},
	{
		ModelName: "K12黄",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160991"},
		},
	},
	{
		ModelName: "T12磨砂灰",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160984"},
		},
	},
	{
		ModelName: "M166肤",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375331190"},
		},
	},
	{
		ModelName: "M166黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375331183"},
		},
	},
	{
		ModelName: "10000M无线充电",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330650"},
		},
	},
	{
		ModelName: "5000M无线充电",
		BarcodeList: []BarcodeItem{
			{Barcode: "6976375330643"},
		},
	},
	{
		ModelName: "45w套装1米成套",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160922"},
			{Barcode: "6977676160267"},
			{Barcode: "6977676160366"},
			{Barcode: "6977676160502"},
		},
	},
	{
		ModelName: "45w套装2米成套",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160939"},
			{Barcode: "6977676160274"},
			{Barcode: "6977676160373"},
			{Barcode: "6977676160519"},
		},
	},
	{
		ModelName: "半入耳有线3.5",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160564"},
		},
	},
	{
		ModelName: "半入耳有线tc",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160557"},
		},
	},
	{
		ModelName: "磁吸充电宝 KW107 象牙白",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160793"},
		},
	},
	{
		ModelName: "移动电源KP90丁香紫",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160786"},
		},
	},
	{
		ModelName: "移动电源KP90樱花粉",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160779"},
		},
	},
	{
		ModelName: "移动电源KP90象牙白",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160755"},
		},
	},
	{
		ModelName: "移动电源KP90高雅黑",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160762"},
		},
	},
	{
		ModelName: "30w套装1米成套",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160281"},
			{Barcode: "6977676160427"},
			{Barcode: "6977676160465"},
		},
	},
	{
		ModelName: "30w套装2米成套",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160298"},
			{Barcode: "6977676160434"},
			{Barcode: "6977676160472"},
		},
	},
	{
		ModelName: "爱马仕橙45w充电头",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160854"},
		},
	},
	{
		ModelName: "爱马仕橙45w套装",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160861"},
		},
	},
	{
		ModelName: "爱马仕橙CC1米线",
		BarcodeList: []BarcodeItem{
			{Barcode: "6977676160847"},
		},
	},
}

// GetModelByBarcode 根据条码查询对应型号
func GetModelByBarcode(targetBarcode string) (string, bool) {
	for _, g := range BarcodeData {
		for _, item := range g.BarcodeList {
			if item.Barcode == targetBarcode {
				return g.ModelName, true
			}
		}
	}
	return "", false
}
